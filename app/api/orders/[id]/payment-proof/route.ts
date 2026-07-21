import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  createOrderDiscordNotification,
  updateOrderDiscordNotification,
} from "@/lib/discord";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

interface PaymentProofContext {
  params: { id: string };
}

export async function GET(_: NextRequest, { params }: PaymentProofContext) {
  const supabase = createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });

  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_proof_url")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (!order.payment_proof_url) return NextResponse.json({ url: null });

  const service = createServiceRoleClient();
  const { data, error } = await service.storage
    .from("payment-proofs")
    .createSignedUrl(order.payment_proof_url, 600);
  if (error) return NextResponse.json({ error: "Bukti pembayaran tidak dapat dimuat." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}

export async function POST(request: NextRequest, { params }: PaymentProofContext) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Permintaan upload tidak valid." }, { status: 403 });
  }

  const supabase = createCustomerServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) {
    return NextResponse.json({ error: "Sesi Anda telah berakhir." }, { status: 401 });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (
    order.order_status !== "pending_payment" ||
    !["pending", "rejected"].includes(order.payment_status)
  ) {
    return NextResponse.json(
      { error: "Bukti pembayaran hanya dapat diunggah untuk pesanan yang menunggu pembayaran." },
      { status: 409 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form upload tidak valid." }, { status: 400 });
  }
  const proof = formData.get("proof");
  const notesValue = formData.get("notes");
  const notes = typeof notesValue === "string" ? notesValue.trim() : "";
  if (!(proof instanceof File)) {
    return NextResponse.json({ error: "Pilih gambar bukti pembayaran." }, { status: 400 });
  }
  const extension = ALLOWED_TYPES[proof.type];
  if (!extension) {
    return NextResponse.json({ error: "Format harus JPG, JPEG, PNG, atau WEBP." }, { status: 400 });
  }
  if (proof.size <= 0 || proof.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Ukuran gambar maksimal 5 MB." }, { status: 400 });
  }
  if (notes.length > 500) {
    return NextResponse.json({ error: "Catatan maksimal 500 karakter." }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const objectPath = `${user.id}/${order.id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await service.storage
    .from("payment-proofs")
    .upload(objectPath, proof, { contentType: proof.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: "Bukti pembayaran gagal diunggah." }, { status: 500 });
  }

  const { data: updatedOrder, error: updateError } = await service
    .from("orders")
    .update({
      payment_proof_url: objectPath,
      payment_uploaded_at: new Date().toISOString(),
      payment_notes: notes || null,
      payment_rejection_reason: null,
      payment_status: "waiting_verification",
      order_status: "waiting_verification",
    })
    .eq("id", order.id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (updateError || !updatedOrder) {
    await service.storage.from("payment-proofs").remove([objectPath]);
    return NextResponse.json({ error: "Pesanan gagal diperbarui." }, { status: 500 });
  }

  if (order.payment_proof_url && order.payment_proof_url !== objectPath) {
    await service.storage.from("payment-proofs").remove([order.payment_proof_url]);
  }
  if (updatedOrder.discord_message_id) {
    await updateOrderDiscordNotification(updatedOrder);
  } else {
    const discordMessageId = await createOrderDiscordNotification(updatedOrder);
    if (discordMessageId) {
      await service.from("orders").update({ discord_message_id: discordMessageId }).eq("id", updatedOrder.id);
    }
  }

  const { data: signed } = await service.storage
    .from("payment-proofs")
    .createSignedUrl(objectPath, 600);
  return NextResponse.json({ success: true, url: signed?.signedUrl ?? null });
}
