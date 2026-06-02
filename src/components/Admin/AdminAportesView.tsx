"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Inbox,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import AdminAportesDetail from "./AdminAportesDetail";
import {
  buildAdminInboxTabs,
  buildClientStats,
  filterContributionsByInboxTab,
  formatDate,
  publicationWorkflow,
  sortContributionsForReview,
  statusLabel,
  statusWorkflow,
  type Attachment,
  type Contribution,
  type InboxState,
  type InboxPayload,
  type InboxTab,
  type PublicationStatus,
  type ReviewLinkTarget,
  type ReviewStatus,
} from "./AdminAportesTypes";
import styles from "./AdminAportesView.module.css";

export default function AdminAportesView() {
  const [inbox, setInbox] = useState<InboxPayload | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState<InboxTab>("active");
  const [note, setNote] = useState("");
  const [inboxNote, setInboxNote] = useState("");
  const [linkTargetType, setLinkTargetType] = useState<ReviewLinkTarget>("case");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkTargetLabel, setLinkTargetLabel] = useState("");
  const [linkNote, setLinkNote] = useState("");
  const [publicationTargetId, setPublicationTargetId] = useState("");
  const [curationStatus, setCurationStatus] = useState<Extract<PublicationStatus, "candidate" | "published_curated">>("candidate");
  const [curationTitle, setCurationTitle] = useState("");
  const [curationCaption, setCurationCaption] = useState("");
  const [curationCaveat, setCurationCaveat] = useState("No reemplaza la fuente oficial ni confirma por sí solo la relación investigada.");
  const [curationSourceLabel, setCurationSourceLabel] = useState("Aporte privado revisado por Faro");
  const [curationPermissionNote, setCurationPermissionNote] = useState("La persona confirmó que era material propio o autorizado para revisión.");
  const [curationAttachmentId, setCurationAttachmentId] = useState("");
  const [curationMediaAltText, setCurationMediaAltText] = useState("");
  const [statusText, setStatusText] = useState("");
  const [loading, setLoading] = useState(false);

  const inboxTabs = useMemo(() => buildAdminInboxTabs(inbox?.submissions ?? []), [inbox?.submissions]);

  const filtered = useMemo(() => {
    const submissions = sortContributionsForReview(inbox?.submissions ?? []);
    return filterContributionsByInboxTab(submissions, activeTab);
  }, [activeTab, inbox?.submissions]);
  const selected = filtered.find((submission) => submission.id === selectedId) ??
    filtered[0] ??
    null;
  const selectedCaseLinks = selected?.reviewLinks?.filter((link) => link.targetType === "case") ?? [];
  const selectedCaseLink = selectedCaseLinks.find((link) => link.targetId === publicationTargetId) ??
    selectedCaseLinks[0] ??
    null;

  useEffect(() => {
    if (!selected) return;
    setCurationTitle(selected.title);
    setCurationCaption(selected.explanation.slice(0, 220));
    const imageAttachment = selected.attachments.find(isImageAttachment);
    setCurationAttachmentId(imageAttachment?.id ?? "");
    setCurationMediaAltText(imageAttachment ? `Imagen aportada para revisar ${selected.title}.` : "");
  }, [selected?.id]);

  useEffect(() => {
    const firstCaseLink = selected?.reviewLinks?.find((link) => link.targetType === "case");
    setPublicationTargetId(firstCaseLink?.targetId ?? "");
  }, [selected?.id, selected?.reviewLinks?.length]);

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId) setSelectedId("");
      return;
    }
    if (!filtered.some((submission) => submission.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  async function loadInbox() {
    setLoading(true);
    setStatusText("Cargando bandeja privada...");
    try {
      const response = await fetch("/api/admin/aportes");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "No se pudo abrir la bandeja.");
      const normalizedPayload = payload as InboxPayload;
      const submissions = sortContributionsForReview(normalizedPayload.submissions);
      setInbox({ ...normalizedPayload, submissions, stats: buildClientStats(submissions) });
      const visible = filterContributionsByInboxTab(submissions, activeTab);
      setSelectedId(visible[0]?.id ?? submissions[0]?.id ?? "");
      setStatusText("Bandeja actualizada.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "No se pudo abrir la bandeja.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: ReviewStatus) {
    if (!selected) return;
    setLoading(true);
    setStatusText("Guardando revisión...");
    try {
      const response = await fetch("/api/admin/aportes", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          submissionId: selected.id,
          status,
          note,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "No se pudo actualizar el aporte.");
      const updatedContribution = payload.contribution as Contribution;
      setInbox((current) => {
        if (!current) return current;
        const submissions = current.submissions.map((item) =>
          item.id === selected.id ? updatedContribution : item
        );
        const sorted = sortContributionsForReview(submissions);
        return { ...current, submissions: sorted, stats: buildClientStats(sorted) };
      });
      setSelectedId(updatedContribution.id);
      setNote("");
      setStatusText("Revisión guardada.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "No se pudo actualizar el aporte.");
    } finally {
      setLoading(false);
    }
  }

  async function updateInboxState(inboxState: InboxState) {
    if (!selected) return;
    setLoading(true);
    setStatusText("Actualizando orden de bandeja...");
    try {
      const response = await fetch("/api/admin/aportes", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          submissionId: selected.id,
          inboxState,
          note: inboxNote,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "No se pudo actualizar la bandeja.");
      const updatedContribution = payload.contribution as Contribution;
      setInbox((current) => {
        if (!current) return current;
        const submissions = current.submissions.map((item) =>
          item.id === selected.id ? updatedContribution : item
        );
        const sorted = sortContributionsForReview(submissions);
        return { ...current, submissions: sorted, stats: buildClientStats(sorted) };
      });
      setActiveTab(inboxState === "active" ? "active" : inboxState);
      setSelectedId(updatedContribution.id);
      setInboxNote("");
      setStatusText(inboxState === "active" ? "Aporte restaurado a activos." : "Bandeja actualizada.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "No se pudo actualizar la bandeja.");
    } finally {
      setLoading(false);
    }
  }

  async function openAttachment(attachment: Attachment) {
    if (!selected) return;
    setStatusText("Abriendo archivo privado...");
    try {
      const params = new URLSearchParams({
        submissionId: selected.id,
        attachmentId: attachment.id,
      });
      const response = await fetch(`/api/admin/aportes/attachment?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message ?? "No se pudo abrir el archivo.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatusText("Archivo abierto en una pestaña privada del navegador.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "No se pudo abrir el archivo.");
    }
  }

  async function linkSelectedContribution() {
    if (!selected) return;
    setLoading(true);
    setStatusText("Guardando vínculo privado...");
    try {
      const response = await fetch("/api/admin/aportes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          submissionId: selected.id,
          targetType: linkTargetType,
          targetId: linkTargetId,
          targetLabel: linkTargetLabel,
          note: linkNote,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "No se pudo guardar el vínculo.");
      const updatedContribution = payload.contribution as Contribution;
      setInbox((current) => {
        if (!current) return current;
        const submissions = current.submissions.map((item) =>
          item.id === selected.id ? updatedContribution : item
        );
        const sorted = sortContributionsForReview(submissions);
        return { ...current, submissions: sorted, stats: buildClientStats(sorted) };
      });
      setSelectedId(updatedContribution.id);
      setLinkTargetId("");
      setLinkTargetLabel("");
      setLinkNote("");
      setStatusText("Vínculo privado guardado.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "No se pudo guardar el vínculo.");
    } finally {
      setLoading(false);
    }
  }

  async function promoteSelectedContribution() {
    if (!selected) return;
    const expedienteId = selectedCaseLink?.targetId ?? "";
    setLoading(true);
    setStatusText("Guardando curaduría...");
    try {
      const response = await fetch("/api/admin/aportes/promote", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          submissionId: selected.id,
          expedienteId,
          status: curationStatus,
          title: curationTitle,
          caption: curationCaption,
          caveat: curationCaveat,
          sourceLabel: curationSourceLabel,
          permissionNote: curationPermissionNote,
          attachmentId: curationAttachmentId || undefined,
          mediaAltText: curationAttachmentId ? curationMediaAltText : undefined,
          reviewedByName: "Equipo Faro",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "No se pudo guardar la evidencia curada.");
      const updatedContribution = payload.contribution as Contribution;
      setInbox((current) => {
        if (!current) return current;
        const submissions = current.submissions.map((item) =>
          item.id === selected.id ? updatedContribution : item
        );
        const sorted = sortContributionsForReview(submissions);
        return { ...current, submissions: sorted, stats: buildClientStats(sorted) };
      });
      setSelectedId(updatedContribution.id);
      setStatusText(curationStatus === "published_curated" ? "Evidencia curada publicada." : "Candidatura a publicación guardada.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "No se pudo guardar la evidencia curada.");
    } finally {
      setLoading(false);
    }
  }

  async function withdrawSelectedContributionEvidence() {
    if (!selected || !selectedCaseLink) return;
    setLoading(true);
    setStatusText("Retirando evidencia curada...");
    try {
      const response = await fetch("/api/admin/aportes/withdraw", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          evidenceId: curatedEvidenceClientId(selected.id, selectedCaseLink.targetId),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "No se pudo retirar la evidencia curada.");
      setInbox((current) => {
        if (!current) return current;
        const submissions = current.submissions.map((item) =>
          item.id === selected.id ? { ...item, publicationStatus: "withdrawn" as const } : item
        );
        const sorted = sortContributionsForReview(submissions);
        return { ...current, submissions: sorted, stats: buildClientStats(sorted) };
      });
      setStatusText("Evidencia curada retirada de la vista pública.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "No se pudo retirar la evidencia curada.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.eyebrow}>Admin privado</p>
        <h1>Bandeja de aportes</h1>
        <p>
          Material no verificado enviado por usuarios. No se publica automáticamente en mapa,
          Explorer, informes o exports.
        </p>
        <div className={styles.accountNotice}>
          <span>Cuenta reviewer</span>
          <p>Acceso por invitación con Clerk. Tu rol se valida antes de leer o modificar aportes.</p>
          <button type="button" onClick={() => loadInbox()} disabled={loading}>
            <LockKeyhole size={15} aria-hidden />
            Abrir bandeja
          </button>
        </div>
        <div className={styles.ruleBox}>
          <ShieldAlert size={17} aria-hidden />
          <span>Un aporte aprobado queda listo para investigar o vincular, no se convierte solo en expediente.</span>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.toolbar}>
          <div>
            <p className={styles.eyebrow}>Revisión interna</p>
            <h2>Aportes recibidos</h2>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={() => loadInbox()} disabled={loading}>
            <RefreshCw size={14} aria-hidden />
            Actualizar
          </button>
        </header>

        {statusText && <p className={styles.statusText} aria-live="polite">{statusText}</p>}

        {inbox ? (
          <>
            <div className={styles.stats}>
              <Metric label="Total" value={inbox.stats.total} />
              <Metric label="Recibidos" value={inbox.stats.submitted} />
              <Metric label="En revisión" value={inbox.stats.accepted_for_review} />
              <Metric label="Necesita más info" value={inbox.stats.needs_more_info} />
            </div>
            <section className={styles.workflowPanel} aria-label="Flujo operativo">
              <div>
                <p className={styles.eyebrow}>Flujo operativo</p>
                <h3>recibido → en revisión → necesita más info → aprobado para investigar → descartado</h3>
                <p>Los aportes siguen siendo privados. Publicar exige una curaduría admin separada.</p>
              </div>
              <div className={styles.publicationRail} aria-label="Estado de publicación">
                {publicationWorkflow.map((step) => (
                  <span key={step.value}>{step.label}</span>
                ))}
              </div>
              <div className={styles.workflowSteps}>
                {statusWorkflow.map((step) => (
                  <div
                    key={step.value}
                    className={styles.workflowStep}
                  >
                    <span>{step.label}</span>
                    <strong>{inbox.stats[step.value]}</strong>
                    <small>{step.description}</small>
                  </div>
                ))}
              </div>
            </section>
            <nav className={styles.inboxTabs} aria-label="Bandejas de aportes">
              {inboxTabs.map((option) => (
                <button
                  key={option.value}
                  className={activeTab === option.value ? styles.activeFilter : ""}
                  type="button"
                  onClick={() => setActiveTab(option.value)}
                  aria-pressed={activeTab === option.value}
                >
                  {option.label}
                  <span>{option.count}</span>
                </button>
              ))}
            </nav>
            <div className={styles.grid}>
              <div className={styles.list} aria-label="Aportes">
                {filtered.length === 0 ? (
                  <p className={styles.empty}>No hay aportes en esta bandeja.</p>
                ) : filtered.map((submission) => (
                  <button
                    key={submission.id}
                    type="button"
                    className={`${styles.listItem} ${selected?.id === submission.id ? styles.listItemActive : ""}`}
                    onClick={() => setSelectedId(submission.id)}
                  >
                    <span>{statusLabel(submission.status)}</span>
                    <strong>{submission.title}</strong>
                    <small>{submission.id} · {formatDate(submission.createdAt)}</small>
                  </button>
                ))}
              </div>
              <AdminAportesDetail
                contribution={selected}
                note={note}
                inboxNote={inboxNote}
                linkTargetType={linkTargetType}
                linkTargetId={linkTargetId}
                linkTargetLabel={linkTargetLabel}
                linkNote={linkNote}
                publicationTargetId={publicationTargetId}
                publicationCaseLinks={selectedCaseLinks}
                onNoteChange={setNote}
                onLinkTargetTypeChange={setLinkTargetType}
                onLinkTargetIdChange={setLinkTargetId}
                onLinkTargetLabelChange={setLinkTargetLabel}
                onLinkNoteChange={setLinkNote}
                onPublicationTargetIdChange={setPublicationTargetId}
                curationStatus={curationStatus}
                curationTitle={curationTitle}
                curationCaption={curationCaption}
                curationCaveat={curationCaveat}
                curationSourceLabel={curationSourceLabel}
                curationPermissionNote={curationPermissionNote}
                curationAttachmentId={curationAttachmentId}
                curationMediaAltText={curationMediaAltText}
                onCurationStatusChange={setCurationStatus}
                onCurationTitleChange={setCurationTitle}
                onCurationCaptionChange={setCurationCaption}
                onCurationCaveatChange={setCurationCaveat}
                onCurationSourceLabelChange={setCurationSourceLabel}
                onCurationPermissionNoteChange={setCurationPermissionNote}
                onCurationAttachmentIdChange={setCurationAttachmentId}
                onCurationMediaAltTextChange={setCurationMediaAltText}
                onOpenAttachment={openAttachment}
                onUpdateStatus={updateStatus}
                onInboxNoteChange={setInboxNote}
                onUpdateInboxState={updateInboxState}
                onLinkContribution={linkSelectedContribution}
                onPromoteContribution={promoteSelectedContribution}
                onWithdrawCuratedEvidence={withdrawSelectedContributionEvidence}
                loading={loading}
              />
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <Inbox size={22} aria-hidden />
            <p>Usá una cuenta Faro reviewer o admin para cargar la bandeja de revisión.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong></div>;
}

function curatedEvidenceClientId(submissionId: string, expedienteId: string): string {
  const normalize = (value: string) => value.trim().replace(/[^A-Z0-9-]+/gi, "-").toUpperCase();
  return `CURATED-${normalize(submissionId)}-${normalize(expedienteId)}`;
}

function isImageAttachment(attachment: Attachment): boolean {
  return attachment.mimeType.toLowerCase().startsWith("image/");
}
