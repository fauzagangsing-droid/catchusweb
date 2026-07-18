import "server-only";
import { formatRupiah } from "@/lib/adapters";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/types/order";
import type { Order, OrderStatus } from "@/types/database";

const DISCORD_COLORS = {
  blue: 0x3498db,
  yellow: 0xf1c40f,
  green: 0x2ecc71,
  orange: 0xe67e22,
  purple: 0x9b59b6,
  darkGray: 0x4f545c,
  red: 0xe74c3c,
} as const;

const PROGRESS_STEPS: Array<{ status: OrderStatus; label: string }> = [
  { status: "pending_payment", label: "Menunggu Pembayaran" },
  { status: "waiting_verification", label: "Menunggu Verifikasi" },
  { status: "paid", label: "Sudah Dibayar" },
  { status: "processing", label: "Sedang Diproses" },
  { status: "shipped", label: "Sedang Dikirim" },
  { status: "completed", label: "Selesai" },
];

interface DiscordWebhookMessage {
  id?: string;
}

function getEmbedColor(order: Order): number {
  if (order.payment_status === "rejected") return DISCORD_COLORS.red;

  switch (order.order_status) {
    case "waiting_verification":
      return DISCORD_COLORS.yellow;
    case "paid":
      return DISCORD_COLORS.green;
    case "processing":
    case "shipped":
      return DISCORD_COLORS.orange;
    case "completed":
      return DISCORD_COLORS.purple;
    case "cancelled":
      return DISCORD_COLORS.darkGray;
    default:
      return DISCORD_COLORS.blue;
  }
}

function getProgressDescription(order: Order): string {
  if (order.payment_status === "rejected") {
    return [
      "🔴 Pembayaran Ditolak",
      "",
      ...PROGRESS_STEPS.map(({ label }) => `⬜ ${label}`),
    ].join("\n");
  }

  if (order.order_status === "cancelled") {
    return [
      "⚫ Pesanan Dibatalkan",
      "",
      ...PROGRESS_STEPS.map(({ label }) => `⬜ ${label}`),
    ].join("\n");
  }

  const currentIndex = PROGRESS_STEPS.findIndex(
    ({ status }) => status === order.order_status
  );

  return PROGRESS_STEPS.map(({ label }, index) => {
    if (index < currentIndex) return `🟢 ${label}`;
    if (index === currentIndex) return `🟡 ${label}`;
    return `⬜ ${label}`;
  }).join("\n");
}

function createOrderEmbed(order: Order) {
  return {
    title: "🛒 Pesanan Baru",
    description: getProgressDescription(order),
    color: getEmbedColor(order),
    fields: [
      {
        name: "👤 Pelanggan",
        value: `${order.shipping_full_name}\n${order.customer_email}`,
        inline: false,
      },
      {
        name: "🧾 Nomor Pesanan",
        value: order.order_number,
        inline: true,
      },
      {
        name: "💰 Total Pembayaran",
        value: formatRupiah(order.total),
        inline: true,
      },
      {
        name: "💳 Metode Pembayaran",
        value: PAYMENT_METHOD_LABELS[order.payment_method],
        inline: true,
      },
      {
        name: "💵 Status Pembayaran",
        value: PAYMENT_STATUS_LABELS[order.payment_status],
        inline: true,
      },
      {
        name: "📦 Status Pesanan",
        value: ORDER_STATUS_LABELS[order.order_status],
        inline: true,
      },
      {
        name: "🕒 Dibuat Pada",
        value: new Intl.DateTimeFormat("id-ID", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "Asia/Jakarta",
        }).format(new Date(order.created_at)),
        inline: false,
      },
    ],
    footer: { text: "Catchus Official • https://catchus.my.id" },
    timestamp: new Date().toISOString(),
  };
}

function createWebhookUrl(webhookUrl: string, messageId?: string): URL {
  const url = new URL(webhookUrl);

  if (messageId) {
    url.search = "";
    url.pathname = `${url.pathname.replace(/\/$/, "")}/messages/${encodeURIComponent(messageId)}`;
  } else {
    url.searchParams.set("wait", "true");
  }

  return url;
}

export async function createOrderDiscordNotification(
  order: Order
): Promise<string | null> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  const notifyUserId = process.env.DISCORD_NOTIFY_USER_ID?.trim();
  if (!webhookUrl) {
    console.error("Notifikasi Discord dilewati: DISCORD_WEBHOOK_URL belum dikonfigurasi.");
    return null;
  }

  const mention = notifyUserId ? `<@${notifyUserId}>` : "";

  try {
    const response = await fetch(createWebhookUrl(webhookUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: mention,
        embeds: [createOrderEmbed(order)],
        allowed_mentions: {
          users: notifyUserId ? [notifyUserId] : [],
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Pembuatan pesan Discord gagal dengan status ${response.status}.`);
      return null;
    }

    const message = (await response.json()) as DiscordWebhookMessage;
    if (!message.id) {
      console.error("Discord tidak mengembalikan ID pesan.");
      return null;
    }

    return message.id;
  } catch (error) {
    console.error("Permintaan pembuatan pesan Discord gagal.", error);
    return null;
  }
}

export async function updateOrderDiscordNotification(order: Order): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl || !order.discord_message_id) {
    console.error(
      "Pembaruan Discord dilewati: URL webhook atau ID pesan tidak tersedia."
    );
    return;
  }

  try {
    const response = await fetch(
      createWebhookUrl(webhookUrl, order.discord_message_id),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          embeds: [createOrderEmbed(order)],
          allowed_mentions: { users: [] },
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(`Pembaruan pesan Discord gagal dengan status ${response.status}.`);
    }
  } catch (error) {
    console.error("Permintaan pembaruan pesan Discord gagal.", error);
  }
}
