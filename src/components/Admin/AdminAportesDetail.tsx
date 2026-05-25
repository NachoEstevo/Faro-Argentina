import { CheckCircle2, FileText, Link2 } from "lucide-react";

import {
  formatBytes,
  formatDate,
  statusLabel,
  statusWorkflow,
  type Attachment,
  type Contribution,
  type ReviewLinkTarget,
  type ReviewStatus,
} from "./AdminAportesTypes";
import styles from "./AdminAportesView.module.css";

interface Props {
  contribution: Contribution | null;
  note: string;
  linkTargetType: ReviewLinkTarget;
  linkTargetId: string;
  linkTargetLabel: string;
  linkNote: string;
  loading: boolean;
  onNoteChange: (value: string) => void;
  onLinkTargetTypeChange: (value: ReviewLinkTarget) => void;
  onLinkTargetIdChange: (value: string) => void;
  onLinkTargetLabelChange: (value: string) => void;
  onLinkNoteChange: (value: string) => void;
  onOpenAttachment: (attachment: Attachment) => void;
  onUpdateStatus: (status: ReviewStatus) => void;
  onLinkContribution: () => void;
}

export default function AdminAportesDetail({
  contribution,
  note,
  linkTargetType,
  linkTargetId,
  linkTargetLabel,
  linkNote,
  loading,
  onNoteChange,
  onLinkTargetTypeChange,
  onLinkTargetIdChange,
  onLinkTargetLabelChange,
  onLinkNoteChange,
  onOpenAttachment,
  onUpdateStatus,
  onLinkContribution,
}: Props) {
  if (!contribution) {
    return <article className={styles.detail}><p className={styles.empty}>Seleccioná un aporte.</p></article>;
  }
  const lastReview = contribution.reviewTrail?.at(-1) ?? null;
  const trail = contribution.reviewTrail ?? [];
  const links = contribution.reviewLinks ?? [];
  return (
    <article className={styles.detail}>
      <div className={styles.detailHead}>
        <span className={styles.statusPill}>{statusLabel(contribution.status)}</span>
        <h3>{contribution.title}</h3>
        <p>{contribution.explanation}</p>
      </div>
      <dl className={styles.facts}>
        <Fact label="Jurisdicción" value={contribution.jurisdiction} />
        <Fact label="Modo de contacto" value={privacyModeLabel(contribution)} />
        <Fact label="Contacto" value={[contribution.contactName, contribution.contactEmail].filter(Boolean).join(" · ")} />
        <Fact label="Caso relacionado" value={contribution.relatedCase} />
        <Fact label="Organismo" value={contribution.organization} />
        <Fact label="Entidad" value={contribution.namedEntity} />
        <Fact label="Ubicación" value={contribution.approximateLocation} />
        <Fact label="Fecha o monto" value={contribution.amountOrDate ?? contribution.capturedAt} />
        <Fact label="Fuente" value={contribution.publicSourceUrl} href={contribution.publicSourceUrl} />
        <Fact label="Falta verificar" value={contribution.missingVerification} />
      </dl>
      <section className={styles.files}>
        <h4>Archivos privados</h4>
        <p className={styles.reviewCaution}>
          Revisar metadatos, contenido visible y permisos antes de usar un archivo aportado. El modo sin contacto no vuelve anonimo el archivo original.
        </p>
        {contribution.attachments.length === 0 ? (
          <p className={styles.empty}>Sin archivos adjuntos.</p>
        ) : contribution.attachments.map((attachment) => (
          <button key={attachment.id} type="button" onClick={() => onOpenAttachment(attachment)}>
            <FileText size={14} aria-hidden />
            {attachment.originalFilename} · {formatBytes(attachment.sizeBytes)}
          </button>
        ))}
      </section>
      <section className={styles.reviewBox}>
        <label>
          <span>Nota interna</span>
          <textarea value={note} onChange={(event) => onNoteChange(event.target.value)} />
        </label>
        <div className={styles.actionGrid}>
          {statusWorkflow.filter((option) => option.value !== "submitted").map((option) => (
            <button key={option.value} type="button" onClick={() => onUpdateStatus(option.value)} disabled={loading}>
              {option.value === "approved" && <CheckCircle2 size={14} aria-hidden />}
              {option.actionLabel}
            </button>
          ))}
        </div>
        {lastReview && <p className={styles.lastReview}>Última nota: {lastReview.note || "sin nota"} · {lastReview.reviewerName}</p>}
      </section>
      <section className={styles.timeline} aria-label="Trazabilidad interna">
        <h4>Trazabilidad interna</h4>
        {trail.length === 0 ? (
          <p className={styles.empty}>Todavía no hay eventos internos. El aporte figura como {statusLabel(contribution.status)}.</p>
        ) : (
          <ol>
            {trail.map((entry) => (
              <li key={entry.id}>
                <span>{formatDate(entry.createdAt)} · {entry.reviewerName}</span>
                <strong>{statusLabel(entry.status)}</strong>
                <p>{entry.note || "Sin nota interna."}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className={styles.linkBox}>
        <div className={styles.linkIntro}>
          <h4>Vincular a expediente o carpeta</h4>
          <p>Sólo material aprobado. El vínculo queda privado y no modifica el expediente oficial.</p>
        </div>
        <div className={styles.linkGrid}>
          <label>
            <span>Destino</span>
            <select
              value={linkTargetType}
              onChange={(event) => onLinkTargetTypeChange(event.target.value as ReviewLinkTarget)}
            >
              <option value="case">Expediente existente</option>
              <option value="workspace">Carpeta interna</option>
            </select>
          </label>
          <label>
            <span>ID de expediente o carpeta</span>
            <input
              value={linkTargetId}
              onChange={(event) => onLinkTargetIdChange(event.target.value)}
              placeholder={linkTargetType === "case" ? "AR-CONTRACT-..." : "carpeta-lazaro-baez"}
            />
          </label>
          {linkTargetType === "workspace" && (
            <label>
              <span>Nombre visible de carpeta</span>
              <input value={linkTargetLabel} onChange={(event) => onLinkTargetLabelChange(event.target.value)} />
            </label>
          )}
          <label className={styles.linkNote}>
            <span>Nota de vínculo</span>
            <textarea value={linkNote} onChange={(event) => onLinkNoteChange(event.target.value)} />
          </label>
        </div>
        <button
          type="button"
          className={styles.linkButton}
          onClick={onLinkContribution}
          disabled={loading || contribution.status !== "approved" || !linkTargetId.trim()}
        >
          <Link2 size={14} aria-hidden />
          Guardar vínculo
        </button>
        {links.length > 0 && (
          <div className={styles.linkList}>
            {links.map((link) => (
              <div key={link.id}>
                <span>{link.targetType === "case" ? "Expediente" : "Carpeta"}</span>
                <strong>{link.targetLabel}</strong>
                <small>{link.targetId} · {formatDate(link.createdAt)} · {link.linkedBy}</small>
                {link.note && <p>{link.note}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}

function Fact({ label, value, href }: { label: string; value?: string | null; href?: string | null }) {
  if (!value) return null;
  return <div><dt>{label}</dt><dd>{href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : value}</dd></div>;
}

function privacyModeLabel(contribution: Contribution): string {
  if (contribution.privacyMode === "contact") return "Permite contacto";
  if (contribution.privacyMode === "anonymous") return "Sin contacto";
  return contribution.contactEmail ? "Permite contacto" : "Sin contacto";
}
