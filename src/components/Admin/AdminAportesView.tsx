"use client";

import { useMemo, useState } from "react";
import {
  Inbox,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import AdminAportesDetail from "./AdminAportesDetail";
import {
  buildClientStats,
  formatDate,
  sortContributionsForReview,
  statusLabel,
  statusOptions,
  statusWorkflow,
  type Attachment,
  type Contribution,
  type InboxPayload,
  type ReviewLinkTarget,
  type ReviewStatus,
} from "./AdminAportesTypes";
import styles from "./AdminAportesView.module.css";

export default function AdminAportesView() {
  const [inbox, setInbox] = useState<InboxPayload | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<ReviewStatus | "all">("all");
  const [note, setNote] = useState("");
  const [linkTargetType, setLinkTargetType] = useState<ReviewLinkTarget>("case");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkTargetLabel, setLinkTargetLabel] = useState("");
  const [linkNote, setLinkNote] = useState("");
  const [statusText, setStatusText] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const submissions = sortContributionsForReview(inbox?.submissions ?? []);
    return filter === "all" ? submissions : submissions.filter((item) => item.status === filter);
  }, [filter, inbox?.submissions]);
  const selected = filtered.find((submission) => submission.id === selectedId) ??
    filtered[0] ??
    null;

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
      setSelectedId(submissions[0]?.id ?? "");
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

  async function openAttachment(attachment: Attachment) {
    setStatusText("Abriendo archivo privado...");
    try {
      const response = await fetch(`/api/admin/aportes/attachment?key=${encodeURIComponent(attachment.objectKey)}`);
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
          <span>Un aporte aprobado queda listo para cargar o vincular, no se convierte solo en expediente.</span>
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
                <h3>recibido → en revisión → necesita más info → aprobado para cargar → descartado</h3>
                <p>Los aportes siguen siendo privados hasta que el equipo los cargue manualmente.</p>
              </div>
              <div className={styles.workflowSteps}>
                {statusWorkflow.map((step) => (
                  <button
                    key={step.value}
                    type="button"
                    className={`${styles.workflowStep} ${filter === step.value ? styles.workflowStepActive : ""}`}
                    onClick={() => setFilter(step.value)}
                    aria-pressed={filter === step.value}
                  >
                    <span>{step.label}</span>
                    <strong>{inbox.stats[step.value]}</strong>
                    <small>{step.description}</small>
                  </button>
                ))}
              </div>
            </section>
            <div className={styles.filterRow}>
              <button className={filter === "all" ? styles.activeFilter : ""} type="button" onClick={() => setFilter("all")}>Todos</button>
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  className={filter === option.value ? styles.activeFilter : ""}
                  type="button"
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className={styles.grid}>
              <div className={styles.list} aria-label="Aportes">
                {filtered.length === 0 ? (
                  <p className={styles.empty}>No hay aportes en este estado.</p>
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
                linkTargetType={linkTargetType}
                linkTargetId={linkTargetId}
                linkTargetLabel={linkTargetLabel}
                linkNote={linkNote}
                onNoteChange={setNote}
                onLinkTargetTypeChange={setLinkTargetType}
                onLinkTargetIdChange={setLinkTargetId}
                onLinkTargetLabelChange={setLinkTargetLabel}
                onLinkNoteChange={setLinkNote}
                onOpenAttachment={openAttachment}
                onUpdateStatus={updateStatus}
                onLinkContribution={linkSelectedContribution}
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
