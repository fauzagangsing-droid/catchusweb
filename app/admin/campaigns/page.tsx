"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import ProductModal from "@/components/admin/ProductModal";
import CampaignForm, {
  type CampaignFormValues,
  type CampaignUploadProgress,
} from "@/components/admin/CampaignForm";
import CampaignDeleteDialog from "@/components/admin/CampaignDeleteDialog";
import {
  createCampaign,
  deleteCampaign,
  getAdminCampaigns,
  setCampaignActive,
  updateCampaign,
} from "@/lib/admin-campaigns";
import {
  BANNER_IMAGE_BUCKET,
  deleteStorageImage,
  getImagePathFromPublicUrl,
  uploadCampaignImage,
} from "@/lib/storage";
import type { Campaign, CampaignInsert } from "@/types/database";
import styles from "./campaigns.module.css";

function getCampaignStoragePath(url: string | null): string | null {
  return url ? getImagePathFromPublicUrl(url, BANNER_IMAGE_BUCKET) : null;
}

const EMPTY_PROGRESS: CampaignUploadProgress = {
  desktopImage: null,
  mobileImage: null,
};

function CampaignsContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [draftCampaignId, setDraftCampaignId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<CampaignUploadProgress>(EMPTY_PROGRESS);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setListError(null);
    const result = await getAdminCampaigns();
    if (result.error) {
      setCampaigns([]);
      setListError(result.error);
    } else {
      setCampaigns(result.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const openAddModal = () => {
    setEditingCampaign(null);
    setDraftCampaignId(crypto.randomUUID());
    setFormError(null);
    setUploadProgress(EMPTY_PROGRESS);
    setModalOpen(true);
  };

  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setDraftCampaignId(null);
    setFormError(null);
    setUploadProgress(EMPTY_PROGRESS);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (formSubmitting) return;
    setModalOpen(false);
    setEditingCampaign(null);
    setDraftCampaignId(null);
    setFormError(null);
    setUploadProgress(EMPTY_PROGRESS);
  };

  const handleFormSubmit = async (values: CampaignFormValues) => {
    const existingCampaign = editingCampaign;
    const campaignId = existingCampaign?.id ?? draftCampaignId ?? crypto.randomUUID();
    const uploadedPaths: string[] = [];
    let desktopImageUrl = values.desktopImageUrl;
    let mobileImageUrl = values.mobileImageUrl;

    setFormSubmitting(true);
    setFormError(null);
    setUploadProgress(EMPTY_PROGRESS);

    try {
      if (values.desktopImageFile) {
        setUploadProgress((current) => ({ ...current, desktopImage: 0 }));
        const uploaded = await uploadCampaignImage(
          campaignId,
          "desktop",
          values.desktopImageFile,
          (progress) => setUploadProgress((current) => ({ ...current, desktopImage: progress }))
        ).promise;
        uploadedPaths.push(uploaded.path);
        desktopImageUrl = uploaded.publicUrl;
      }

      if (values.mobileImageFile) {
        setUploadProgress((current) => ({ ...current, mobileImage: 0 }));
        const uploaded = await uploadCampaignImage(
          campaignId,
          "mobile",
          values.mobileImageFile,
          (progress) => setUploadProgress((current) => ({ ...current, mobileImage: progress }))
        ).promise;
        uploadedPaths.push(uploaded.path);
        mobileImageUrl = uploaded.publicUrl;
      }

      const payload: CampaignInsert = {
        id: campaignId,
        label: values.label || null,
        title: values.title,
        description: values.description || null,
        image_url: null,
        desktop_image_url: desktopImageUrl,
        mobile_image_url: mobileImageUrl,
        button_text: values.buttonText,
        button_url: values.buttonUrl,
        is_active: values.isActive,
        display_order: values.displayOrder,
      };

      const result = existingCampaign
        ? await updateCampaign(existingCampaign.id, payload)
        : await createCampaign(payload);

      if (result.error || !result.data) {
        throw new Error(result.error ?? "Campaign could not be saved.");
      }

      const previousDesktopImage = existingCampaign?.desktop_image_url ?? existingCampaign?.image_url ?? null;
      const replacedPaths = existingCampaign
        ? [
            previousDesktopImage !== desktopImageUrl
              ? getCampaignStoragePath(previousDesktopImage)
              : null,
            existingCampaign.mobile_image_url !== mobileImageUrl
              ? getCampaignStoragePath(existingCampaign.mobile_image_url)
              : null,
          ].filter((path): path is string => Boolean(path))
        : [];
      await Promise.all(
        [...new Set(replacedPaths)].map((path) => deleteStorageImage(path, BANNER_IMAGE_BUCKET))
      );

      setModalOpen(false);
      setEditingCampaign(null);
      setDraftCampaignId(null);
      setSuccessMessage(existingCampaign ? "Campaign updated successfully." : "Campaign added successfully.");
      await loadCampaigns();
    } catch (error) {
      await Promise.all(
        uploadedPaths.map((path) => deleteStorageImage(path, BANNER_IMAGE_BUCKET))
      );
      setFormError(error instanceof Error ? error.message : "Campaign could not be saved.");
    } finally {
      setFormSubmitting(false);
      setUploadProgress(EMPTY_PROGRESS);
    }
  };

  const handleToggleActive = async (campaign: Campaign) => {
    const nextActive = !campaign.is_active;
    setTogglingId(campaign.id);
    setListError(null);
    setCampaigns((current) =>
      current.map((item) =>
        item.id === campaign.id ? { ...item, is_active: nextActive } : item
      )
    );

    const result = await setCampaignActive(campaign.id, nextActive);
    if (result.error) {
      setCampaigns((current) =>
        current.map((item) =>
          item.id === campaign.id ? { ...item, is_active: campaign.is_active } : item
        )
      );
      setListError(result.error);
    }
    setTogglingId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCampaign) return;
    setDeleteSubmitting(true);
    setDeleteError(null);

    const result = await deleteCampaign(deletingCampaign.id);
    if (result.error) {
      setDeleteError(result.error);
      setDeleteSubmitting(false);
      return;
    }

    const paths = [
      getCampaignStoragePath(deletingCampaign.desktop_image_url ?? deletingCampaign.image_url),
      getCampaignStoragePath(deletingCampaign.mobile_image_url),
    ].filter((path): path is string => Boolean(path));
    await Promise.all(
      [...new Set(paths)].map((path) => deleteStorageImage(path, BANNER_IMAGE_BUCKET))
    );

    setDeleteSubmitting(false);
    setDeletingCampaign(null);
    setSuccessMessage("Campaign deleted successfully.");
    await loadCampaigns();
  };

  return (
    <div className={styles.shell}>
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={styles.main}>
        <Topbar title="Campaigns" onOpenMobile={() => setMobileOpen(true)} />
        <div className={styles.content}>
          {listError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><i className="ri-error-warning-line" /><span>{listError}</span></div>}
          {successMessage && <div className={`${styles.notice} ${styles.successNotice}`} role="status"><i className="ri-checkbox-circle-line" /><span>{successMessage}</span></div>}

          <div className={styles.pageHeader}>
            <div>
              <h2>Homepage Campaign</h2>
              <p>Manage the independent editorial blocks displayed after New Arrivals.</p>
            </div>
            <button type="button" className={styles.addButton} onClick={openAddModal}><i className="ri-add-line" />Add Campaign</button>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Campaign</th><th>Order</th><th>Desktop Image</th><th>Mobile Image</th><th>CTA</th><th>Active</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className={styles.stateCell}><span className={styles.spinner} />Loading campaigns...</td></tr>
                  ) : campaigns.length === 0 ? (
                    <tr><td colSpan={7} className={styles.stateCell}>No Campaigns yet. Add one to show the section on the homepage.</td></tr>
                  ) : campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td><div className={styles.campaignInfo}><strong>{campaign.title}</strong><span>{campaign.label || "No label"}</span></div></td>
                      <td><span className={styles.orderBadge}>{campaign.display_order}</span></td>
                      <td>{(campaign.desktop_image_url ?? campaign.image_url) ? <div className={styles.thumb}><Image src={campaign.desktop_image_url ?? campaign.image_url ?? ""} alt="" fill sizes="76px" unoptimized /></div> : <span className={styles.muted}>None</span>}</td>
                      <td>{campaign.mobile_image_url ? <div className={`${styles.thumb} ${styles.mobileThumb}`}><Image src={campaign.mobile_image_url} alt="" fill sizes="50px" unoptimized /></div> : <span className={styles.muted}>Desktop fallback</span>}</td>
                      <td><div className={styles.ctaInfo}><strong>{campaign.button_text}</strong><span>{campaign.button_url}</span></div></td>
                      <td><button type="button" className={`${styles.statusButton} ${campaign.is_active ? styles.active : styles.inactive}`} onClick={() => handleToggleActive(campaign)} disabled={togglingId === campaign.id} aria-pressed={campaign.is_active}>{campaign.is_active ? "Active" : "Inactive"}</button></td>
                      <td><div className={styles.actionsCell}><button type="button" className={styles.iconButton} onClick={() => openEditModal(campaign)} aria-label={`Edit ${campaign.title}`}><i className="ri-pencil-line" /></button><button type="button" className={`${styles.iconButton} ${styles.dangerButton}`} onClick={() => { setDeleteError(null); setDeletingCampaign(campaign); }} aria-label={`Delete ${campaign.title}`}><i className="ri-delete-bin-6-line" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ProductModal title={editingCampaign ? "Edit Campaign" : "Add Campaign"} onClose={closeModal}>
          <CampaignForm initialCampaign={editingCampaign} submitting={formSubmitting} serverError={formError} uploadProgress={uploadProgress} onSubmit={handleFormSubmit} onCancel={closeModal} />
        </ProductModal>
      )}
      {deletingCampaign && <CampaignDeleteDialog campaignTitle={deletingCampaign.title} deleting={deleteSubmitting} error={deleteError} onConfirm={handleConfirmDelete} onCancel={() => { if (!deleteSubmitting) { setDeletingCampaign(null); setDeleteError(null); } }} />}
    </div>
  );
}

export default function AdminCampaignsPage() {
  return <RequireAdminAuth><CampaignsContent /></RequireAdminAuth>;
}
