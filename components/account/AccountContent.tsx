"use client";

import { useState } from "react";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";
import DeleteAccount from "@/components/account/DeleteAccount";
import ProfileCard from "@/components/account/ProfileCard";
import ProfileForm from "@/components/account/ProfileForm";
import styles from "./Account.module.css";

interface AccountContentProps {
  userId: string;
  email: string;
  initialFullName: string | null;
  initialAvatarUrl: string | null;
  verified?: boolean;
}

export default function AccountContent({
  userId,
  email,
  initialFullName,
  initialAvatarUrl,
  verified,
}: AccountContentProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);

  return (
    <main className={`container ${styles.main}`}>
      <div className={styles.header}>
        <h1>My Account</h1>
        <p>Manage your profile and account security.</p>
      </div>
      {verified && <div className={`${styles.message} ${styles.success}`} role="status">Email verified successfully. Welcome to your account.</div>}
      <div className={styles.grid}>
        <ProfileCard userId={userId} fullName={fullName} email={email} avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} />
        <div className={styles.stack}>
          <ProfileForm userId={userId} email={email} initialFullName={fullName} onNameChange={setFullName} />
          <ChangePasswordForm />
          <DeleteAccount email={email} />
        </div>
      </div>
    </main>
  );
}
