import AvatarUploader from "@/components/account/AvatarUploader";
import styles from "./Account.module.css";

interface ProfileCardProps {
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  onAvatarChange: (avatarUrl: string) => void;
}

export default function ProfileCard(props: ProfileCardProps) {
  return (
    <section className={`${styles.card} ${styles.identity}`}>
      <div className={styles.avatar}>
        {props.avatarUrl ? (
          // The avatar bucket host is configured dynamically from Supabase.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.avatarUrl} alt={`${props.fullName ?? "Customer"} profile avatar`} />
        ) : (
          <i className="ri-user-3-line" aria-hidden="true" />
        )}
      </div>
      <strong>{props.fullName || "Catchus Customer"}</strong>
      <span>{props.email}</span>
      <AvatarUploader userId={props.userId} onAvatarChange={props.onAvatarChange} />
    </section>
  );
}
