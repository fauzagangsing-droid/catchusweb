import type { Campaign } from "@/types/database";
import styles from "./CampaignSection.module.css";

interface CampaignSectionProps {
  campaigns: Campaign[];
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export default function CampaignSection({ campaigns }: CampaignSectionProps) {
  if (campaigns.length === 0) return null;

  return (
    <section className={styles.section} aria-label="Catchus Campaign">
      <div className={`container ${styles.inner}`}>
        {campaigns.map((campaign) => {
          const desktopImage = campaign.desktop_image_url ?? campaign.image_url;
          const mobileImage = campaign.mobile_image_url;

          return (
            <article className={styles.campaign} key={campaign.id}>
              {desktopImage ? (
                <picture className={styles.picture}>
                  {mobileImage && <source media="(max-width: 768px)" srcSet={mobileImage} />}
                  {/* Campaign URLs are managed by the authenticated Admin CRUD. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={desktopImage} alt="" className={styles.image} />
                </picture>
              ) : mobileImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mobileImage} alt="" className={`${styles.image} ${styles.mobileOnlyImage}`} />
                  <div className={`${styles.placeholder} ${styles.desktopOnlyPlaceholder}`} aria-hidden="true">
                    <i className="ri-image-line" />
                  </div>
                </>
              ) : (
                <div className={styles.placeholder} aria-hidden="true">
                  <i className="ri-image-line" />
                </div>
              )}

              <div className={styles.overlay} aria-hidden="true" />

              <div className={styles.content}>
                {campaign.label && <span className={styles.label}>{campaign.label}</span>}
                <h2>{campaign.title}</h2>
                {campaign.description && <p>{campaign.description}</p>}
                <a
                  href={campaign.button_url}
                  {...(isExternalUrl(campaign.button_url)
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {campaign.button_text}
                  <i className="ri-arrow-right-line" aria-hidden="true" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
