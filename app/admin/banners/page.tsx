"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import ProductModal from "@/components/admin/ProductModal";
import BannerForm, {
  type BannerFormValues,
  type BannerUploadProgress,
} from "@/components/admin/BannerForm";
import BannerDeleteDialog from "@/components/admin/BannerDeleteDialog";
import {
  createBanner,
  deleteBanner,
  getAdminBanners,
  setBannerActive,
  updateBanner,
} from "@/lib/admin-banners";
import {
  BANNER_IMAGE_BUCKET,
  deleteStorageImage,
  getImagePathFromPublicUrl,
  uploadBannerImage,
  uploadBannerVideo,
} from "@/lib/storage";
import type { Banner, BannerInsert } from "@/types/database";
import styles from "./banners.module.css";

const EMPTY_PROGRESS: BannerUploadProgress = {
  desktopImage: null,
  mobileImage: null,
  desktopVideo: null,
  mobileVideo: null,
};

function getBannerStoragePath(url: string | null): string | null {
  return url ? getImagePathFromPublicUrl(url, BANNER_IMAGE_BUCKET) : null;
}

function BannersContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [draftBannerId, setDraftBannerId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<BannerUploadProgress>(EMPTY_PROGRESS);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setListError(null);
    const result = await getAdminBanners();
    if (result.error) {
      setBanners([]);
      setListError(result.error);
    } else {
      setBanners(result.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  const openAddModal = () => {
    setEditingBanner(null);
    setDraftBannerId(crypto.randomUUID());
    setFormError(null);
    setUploadProgress(EMPTY_PROGRESS);
    setModalOpen(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setDraftBannerId(null);
    setFormError(null);
    setUploadProgress(EMPTY_PROGRESS);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (formSubmitting) return;
    setModalOpen(false);
    setEditingBanner(null);
    setDraftBannerId(null);
    setFormError(null);
    setUploadProgress(EMPTY_PROGRESS);
  };

  const handleFormSubmit = async (values: BannerFormValues) => {
    const bannerId = editingBanner?.id ?? draftBannerId ?? crypto.randomUUID();
    const uploadedPaths: string[] = [];
    let desktopImageUrl = values.desktopImageUrl;
    let mobileImageUrl = values.mobileImageUrl;
    let desktopVideoUrl = values.desktopVideoUrl;
    let mobileVideoUrl = values.mobileVideoUrl;

    setFormSubmitting(true);
    setFormError(null);
    setUploadProgress(EMPTY_PROGRESS);

    try {
      if (values.desktopImageFile) {
        setUploadProgress((current) => ({ ...current, desktopImage: 0 }));
        const uploaded = await uploadBannerImage(
          bannerId,
          values.desktopImageFile,
          (progress) => setUploadProgress((current) => ({ ...current, desktopImage: progress }))
        ).promise;
        uploadedPaths.push(uploaded.path);
        desktopImageUrl = uploaded.publicUrl;
      }

      if (values.mobileImageFile) {
        setUploadProgress((current) => ({ ...current, mobileImage: 0 }));
        const uploaded = await uploadBannerImage(
          bannerId,
          values.mobileImageFile,
          (progress) => setUploadProgress((current) => ({ ...current, mobileImage: progress }))
        ).promise;
        uploadedPaths.push(uploaded.path);
        mobileImageUrl = uploaded.publicUrl;
      }

      if (values.desktopVideoFile) {
        setUploadProgress((current) => ({ ...current, desktopVideo: 0 }));
        const uploaded = await uploadBannerVideo(
          bannerId,
          values.desktopVideoFile,
          (progress) => setUploadProgress((current) => ({ ...current, desktopVideo: progress }))
        ).promise;
        uploadedPaths.push(uploaded.path);
        desktopVideoUrl = uploaded.publicUrl;
      }

      if (values.mobileVideoFile) {
        setUploadProgress((current) => ({ ...current, mobileVideo: 0 }));
        const uploaded = await uploadBannerVideo(
          bannerId,
          values.mobileVideoFile,
          (progress) => setUploadProgress((current) => ({ ...current, mobileVideo: progress }))
        ).promise;
        uploadedPaths.push(uploaded.path);
        mobileVideoUrl = uploaded.publicUrl;
      }

      const payload: BannerInsert = {
        id: bannerId,
        title: values.title,
        subtitle: values.subtitle || null,
        button_text: values.buttonText || null,
        button_url: values.buttonUrl || null,
        desktop_image_url: desktopImageUrl,
        mobile_image_url: mobileImageUrl,
        desktop_video_url: desktopVideoUrl,
        mobile_video_url: mobileVideoUrl,
        is_active: values.isActive,
        display_order: values.displayOrder,
      };

      const result = editingBanner
        ? await updateBanner(editingBanner.id, payload)
        : await createBanner(payload);

      if (result.error || !result.data) {
        throw new Error(result.error ?? "Banner could not be saved.");
      }

      const replacedPaths = editingBanner
        ? [
            editingBanner.desktop_image_url !== desktopImageUrl
              ? getBannerStoragePath(editingBanner.desktop_image_url)
              : null,
            editingBanner.mobile_image_url !== mobileImageUrl
              ? getBannerStoragePath(editingBanner.mobile_image_url)
              : null,
            editingBanner.desktop_video_url !== desktopVideoUrl
              ? getBannerStoragePath(editingBanner.desktop_video_url)
              : null,
            editingBanner.mobile_video_url !== mobileVideoUrl
              ? getBannerStoragePath(editingBanner.mobile_video_url)
              : null,
          ].filter((path): path is string => Boolean(path))
        : [];

      await Promise.all(
        replacedPaths.map((path) => deleteStorageImage(path, BANNER_IMAGE_BUCKET))
      );

      setModalOpen(false);
      setEditingBanner(null);
      setDraftBannerId(null);
      setSuccessMessage(editingBanner ? "Banner updated successfully." : "Banner added successfully.");
      await loadBanners();
    } catch (error) {
      await Promise.all(
        uploadedPaths.map((path) => deleteStorageImage(path, BANNER_IMAGE_BUCKET))
      );
      setFormError(error instanceof Error ? error.message : "Banner could not be saved.");
    } finally {
      setFormSubmitting(false);
      setUploadProgress(EMPTY_PROGRESS);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    const nextActive = !banner.is_active;
    setTogglingId(banner.id);
    setListError(null);
    setBanners((current) =>
      current.map((item) =>
        item.id === banner.id ? { ...item, is_active: nextActive } : item
      )
    );

    const result = await setBannerActive(banner.id, nextActive);
    if (result.error) {
      setBanners((current) =>
        current.map((item) =>
          item.id === banner.id ? { ...item, is_active: banner.is_active } : item
        )
      );
      setListError(result.error);
    }
    setTogglingId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBanner) return;
    setDeleteSubmitting(true);
    setDeleteError(null);

    const result = await deleteBanner(deletingBanner.id);
    if (result.error) {
      setDeleteError(result.error);
      setDeleteSubmitting(false);
      return;
    }

    const paths = [
      getBannerStoragePath(deletingBanner.desktop_image_url),
      getBannerStoragePath(deletingBanner.mobile_image_url),
      getBannerStoragePath(deletingBanner.desktop_video_url),
      getBannerStoragePath(deletingBanner.mobile_video_url),
    ].filter((path): path is string => Boolean(path));
    await Promise.all(paths.map((path) => deleteStorageImage(path, BANNER_IMAGE_BUCKET)));

    setDeleteSubmitting(false);
    setDeletingBanner(null);
    setSuccessMessage("Banner deleted successfully.");
    await loadBanners();
  };

  return (
    <div className={styles.shell}>
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={styles.main}>
        <Topbar title="Banners" onOpenMobile={() => setMobileOpen(true)} />
        <div className={styles.content}>
          {listError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><i className="ri-error-warning-line" /><span>{listError}</span></div>}
          {successMessage && <div className={`${styles.notice} ${styles.successNotice}`} role="status"><i className="ri-checkbox-circle-line" /><span>{successMessage}</span></div>}

          <div className={styles.pageHeader}>
            <div>
              <h2>Homepage campaigns</h2>
              <p>Manage the ordered campaign media shown in the homepage Hero.</p>
            </div>
            <button type="button" className={styles.addButton} onClick={openAddModal}><i className="ri-add-line" />Add Banner</button>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Banner</th><th>Order</th><th>Desktop media</th><th>Mobile media</th><th>Active</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className={styles.stateCell}><span className={styles.spinner} />Loading banners...</td></tr>
                  ) : banners.length === 0 ? (
                    <tr><td colSpan={6} className={styles.stateCell}>No banners yet. The homepage will use its safe fallback.</td></tr>
                  ) : banners.map((banner) => (
                    <tr key={banner.id}>
                      <td><div className={styles.bannerInfo}><strong>{banner.title}</strong><span>{banner.subtitle || "No subtitle"}</span></div></td>
                      <td><span className={styles.orderBadge}>{banner.display_order}</span></td>
                      <td>{banner.desktop_video_url ? <span className={styles.mediaBadge}><i className="ri-video-line" />Video</span> : banner.desktop_image_url ? <div className={styles.thumb}><Image src={banner.desktop_image_url} alt="" fill sizes="76px" unoptimized /></div> : <span className={styles.muted}>None</span>}</td>
                      <td>{banner.mobile_video_url ? <span className={styles.mediaBadge}><i className="ri-video-line" />Video</span> : banner.mobile_image_url ? <div className={styles.thumb}><Image src={banner.mobile_image_url} alt="" fill sizes="76px" unoptimized /></div> : <span className={styles.muted}>Desktop fallback</span>}</td>
                      <td><button type="button" className={`${styles.statusButton} ${banner.is_active ? styles.active : styles.inactive}`} onClick={() => handleToggleActive(banner)} disabled={togglingId === banner.id} aria-pressed={banner.is_active}>{banner.is_active ? "Active" : "Inactive"}</button></td>
                      <td><div className={styles.actionsCell}><button type="button" className={styles.iconButton} onClick={() => openEditModal(banner)} aria-label={`Edit ${banner.title}`}><i className="ri-pencil-line" /></button><button type="button" className={`${styles.iconButton} ${styles.dangerButton}`} onClick={() => { setDeleteError(null); setDeletingBanner(banner); }} aria-label={`Delete ${banner.title}`}><i className="ri-delete-bin-6-line" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ProductModal title={editingBanner ? "Edit Banner" : "Add Banner"} onClose={closeModal}>
          <BannerForm initialBanner={editingBanner} submitting={formSubmitting} serverError={formError} uploadProgress={uploadProgress} onSubmit={handleFormSubmit} onCancel={closeModal} />
        </ProductModal>
      )}
      {deletingBanner && <BannerDeleteDialog bannerTitle={deletingBanner.title} deleting={deleteSubmitting} error={deleteError} onConfirm={handleConfirmDelete} onCancel={() => { if (!deleteSubmitting) { setDeletingBanner(null); setDeleteError(null); } }} />}
    </div>
  );
}

export default function AdminBannersPage() {
  return <RequireAdminAuth><BannersContent /></RequireAdminAuth>;
}
