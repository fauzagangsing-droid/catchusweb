"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { safeNavigationHref } from "@/lib/safe-url";
import type { Banner } from "@/types/database";

interface HeroProps {
  banners: Banner[];
  title: string;
  subtitle: string;
  buttonText: string;
  buttonUrl: string;
}

function formatSlideNumber(value: number): string {
  return String(value).padStart(2, "0");
}

export default function Hero({ banners, title, subtitle, buttonText, buttonUrl }: HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const campaigns = banners.length > 0
    ? banners
    : [{
        id: "homepage-hero-fallback",
        title,
        subtitle,
        button_text: buttonText,
        button_url: buttonUrl,
        desktop_image_url: "/images/catchus.PNG",
        mobile_image_url: null,
        desktop_video_url: null,
        mobile_video_url: null,
        is_active: true,
        display_order: 0,
        created_at: "",
        updated_at: "",
      } satisfies Banner];

  const goToSlide = useCallback((index: number) => {
    setActiveIndex((index + campaigns.length) % campaigns.length);
  }, [campaigns.length]);

  useEffect(() => {
    const syncVideos = () => {
      const videos = heroRef.current?.querySelectorAll<HTMLVideoElement>("[data-hero-video]");
      videos?.forEach((video) => {
        const slideIndex = Number(video.dataset.slideIndex);
        const isVisibleAtBreakpoint = window.getComputedStyle(video).display !== "none";
        if (slideIndex === activeIndex && isVisibleAtBreakpoint) {
          void video.play().catch(() => {
            // Muted background autoplay may still be blocked by browser preferences.
          });
        } else {
          video.pause();
        }
      });
    };

    syncVideos();
    window.addEventListener("resize", syncVideos);
    return () => window.removeEventListener("resize", syncVideos);
  }, [activeIndex]);

  return (
    <section
      className="hero"
      ref={heroRef}
      aria-label="Catchus campaigns"
      aria-roledescription="carousel"
      onKeyDown={(event) => {
        if (campaigns.length < 2) return;
        if (event.key === "ArrowLeft") goToSlide(activeIndex - 1);
        if (event.key === "ArrowRight") goToSlide(activeIndex + 1);
      }}
    >
      <div className="hero-stage">
        {campaigns.map((campaign, index) => {
          const desktopImage = campaign.desktop_image_url || campaign.mobile_image_url || "/images/catchus.PNG";
          const campaignButtonUrl = safeNavigationHref(campaign.button_url);
          const isActive = index === activeIndex;
          const desktopVideoClass = campaign.mobile_video_url
            ? "hero-media-video hero-media-video-desktop"
            : "hero-media-video";

          return (
            <article
              className={`hero-slide${isActive ? " is-active" : ""}`}
              key={campaign.id}
              aria-hidden={!isActive}
            >
              <div className="hero-media" aria-hidden="true">
                <picture>
                  {campaign.mobile_image_url && (
                    <source media="(max-width: 768px)" srcSet={campaign.mobile_image_url} />
                  )}
                  {/* Supabase banner URLs are managed by the existing admin CRUD. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={desktopImage} alt="" fetchPriority={index === 0 ? "high" : "auto"} />
                </picture>

                {campaign.desktop_video_url && (
                  <video
                    className={desktopVideoClass}
                    data-hero-video
                    data-slide-index={index}
                    muted
                    loop
                    playsInline
                    preload={isActive ? "auto" : "metadata"}
                    poster={desktopImage}
                  >
                    <source src={campaign.desktop_video_url} />
                  </video>
                )}

                {campaign.mobile_video_url && (
                  <video
                    className="hero-media-video hero-media-video-mobile"
                    data-hero-video
                    data-slide-index={index}
                    muted
                    loop
                    playsInline
                    preload={isActive ? "auto" : "metadata"}
                    poster={campaign.mobile_image_url || desktopImage}
                  >
                    <source src={campaign.mobile_video_url} />
                  </video>
                )}
              </div>

              <div className="hero-shade" aria-hidden="true" />
              <div className="hero-content">
                <h1>{campaign.title}</h1>
                {campaign.subtitle && <p>{campaign.subtitle}</p>}
                {campaign.button_text && campaignButtonUrl && (
                  <a href={campaignButtonUrl}>{campaign.button_text}<i className="ri-arrow-right-line" aria-hidden="true" /></a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {campaigns.length > 1 && (
        <div className="hero-navigation" aria-label="Campaign navigation">
          <div className="hero-count" aria-live="polite">
            <strong>{formatSlideNumber(activeIndex + 1)}</strong>
            <span>/</span>
            <span>{formatSlideNumber(campaigns.length)}</span>
          </div>
          <div className="hero-pagination">
            {campaigns.map((campaign, index) => (
              <button
                type="button"
                key={campaign.id}
                className={index === activeIndex ? "is-active" : ""}
                onClick={() => goToSlide(index)}
                aria-label={`Show campaign ${index + 1}: ${campaign.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
          </div>
          <div className="hero-arrows">
            <button type="button" onClick={() => goToSlide(activeIndex - 1)} aria-label="Previous campaign">
              <i className="ri-arrow-left-line" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => goToSlide(activeIndex + 1)} aria-label="Next campaign">
              <i className="ri-arrow-right-line" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
