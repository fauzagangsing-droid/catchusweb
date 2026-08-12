"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { detectImageFileMime, imageExtension } from "@/lib/image-signature";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";
import styles from "./Account.module.css";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxAvatarBytes = 2 * 1024 * 1024;

interface AvatarUploaderProps {
  userId: string;
  onAvatarChange: (avatarUrl: string) => void;
}

export default function AvatarUploader({ userId, onAvatarChange }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!allowedTypes.has(file.type)) {
      setMessage("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > maxAvatarBytes) {
      setMessage("Avatar must be 2 MB or smaller.");
      return;
    }

    const detectedMime = await detectImageFileMime(file);
    if (!detectedMime || detectedMime !== file.type) {
      setMessage("The file contents do not match a supported image format.");
      return;
    }

    setLoading(true);
    setMessage(null);
    const supabase = createCustomerBrowserClient();
    const path = `${userId}/avatar-${Date.now()}.${imageExtension(detectedMime)}`;

    const { data: existingFiles } = await supabase.storage.from("avatars").list(userId);
    const existingPaths = (existingFiles ?? []).map((existing) => `${userId}/${existing.name}`);
    if (existingPaths.length > 0) await supabase.storage.from("avatars").remove(existingPaths);

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      setMessage("Unable to upload this avatar. Please try again.");
      setLoading(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicData.publicUrl })
      .eq("id", userId);

    if (profileError) {
      await supabase.storage.from("avatars").remove([path]);
      setMessage("Avatar uploaded but could not be saved to your profile.");
    } else {
      onAvatarChange(publicData.publicUrl);
      setMessage("Avatar updated successfully.");
    }
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <label className={styles.uploadLabel}>
        <i className={loading ? "ri-loader-4-line" : "ri-camera-line"} />
        {loading ? "Uploading..." : "Change Avatar"}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={loading} />
      </label>
      {message && <p className={`${styles.message} ${message.includes("successfully") ? styles.success : styles.error}`} role="status">{message}</p>}
    </>
  );
}
