import { CheckCircle2, FileText, Link2 } from "lucide-react";

import {
  formatBytes,
  formatDate,
  normalizeReviewStatus,
  publicationLabel,
  statusLabel,
  statusWorkflow,
  type Attachment,
  type Contribution,
  type PublicationStatus,
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
  publicationTargetId: string;
  publicationCaseLinks: NonNullable<Contribution["reviewLinks"]>;
  curationStatus: Extract<PublicationStatus, "candidate" | "published_curated">;
  curationTitle: string;
  curationCaption: string;
  curationCaveat: string;
  curationSourceLabel: string;
  curationPermissionNote: string;
  loading: boolean;
  onNoteChange: (value: string) => void;
  onLinkTargetTypeChange: (value: ReviewLinkTarget) => void;
  onLinkTargetIdChange: (value: string) => void;
  onLinkTargetLabelChange: (value: string) => void;
  onLinkNoteChange: (value: string) => void;
  onPublicationTargetIdChange: (value: string) => void;
  onCurationStatusChange: (value: Extract<PublicationStatus, "candidate" | "published_curated">) => void;
  onCurationTitleChange: (value: string) => void;
  onCurationCaptionChange: (value: string) => void;
  onCurationCaveatChange: (value: string) => void;
  onCurationSourceLabelChange: (value: string) => void;
  onCurationPermissionNoteChange: (value: string) => void;
  onOpenAttachment: (attachment: Attachment) => void;
  onUpdateStatus: (status: ReviewStatus) => void;
  onLinkContribution: () => void;
  onPromoteContribution: () => void;
  onWithdrawCuratedEvidence: () => void;
}

export default function AdminAportesDetail({
  contribution,
  note,
  linkTargetType,
  linkTargetId,
  linkTargetLabel,
  linkNote,
  publicationTargetId,
  publicationCaseLinks,
  curationStatus,
  curationTitle,
  curationCaption,
  curationCaveat,
  curationSourceLabel,
  curationPermissionNote,
  loading,
  onNoteChange,
  onLinkTargetTypeChange,
  onLinkTargetIdChange,
  onLinkTargetLabelChange,
  onLinkNoteChange,
  onPublicationTargetIdChange,
  onCurationStatusChange,
  onCurationTitleChange,
  onCurationCaptionChange,
  onCurationCaveatChange,
  onCurationSourceLabelChange,
  onCurationPermissionNoteChange,
  onOpenAttachment,
  onUpdateStatus,
  onLinkContribution,
  onPromoteContribution,
  onWithdrawCuratedEvidence,
}: Props) {
  if (!contribution) {
    return <article className={styles.detail}><p className={styles.empty}>Seleccioná un aporte.</p></article>;
  }
  const lastReview = contribution.reviewTrail?.at(-1) ?? null;
  const trail = contribution.reviewTrail ?? [];
  const links = contribution.reviewLinks ?? [];
  const canLink = normalizeReviewStatus(contribution.status) === "approved_for_investigation";
  const hasCaseLink = publicationCaseLinks.length > 0;
  const selectedPublicationTarget = publicationCaseLinks.find((link) => link.targetId === publicationTargetId) ??
    publicationCaseLinks[0] ??
    null;
  const canPromote = canLink && hasCaseLink;
  const canWithdraw = contribution.publicationStatus === "published_curated" || contribution.publicationStatus === "candidate";
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
              {option.value === "approved_for_investigation" && <CheckCircle2 size={14} aria-hidden />}
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
          disabled={loading || !canLink || !linkTargetId.trim() || !linkNote.trim()}
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
      <section className={styles.publicationBox}>
        <div className={styles.linkIntro}>
          <h4>Publicación curada</h4>
          <p>Admin-only. Aprobar y vincular no publica: esta decisión crea una pieza separada de la evidencia oficial.</p>
        </div>
        <div className={styles.publicationStatusGrid}>
          <div>
            <span>Estado actual</span>
            <strong>{publicationLabel(contribution.publicationStatus)}</strong>
          </div>
          <div>
            <span>Expediente público</span>
            <strong>{selectedPublicationTarget?.targetLabel || selectedPublicationTarget?.targetId || "Falta vínculo a expediente"}</strong>
          </div>
        </div>
        <div className={styles.linkGrid}>
          {publicationCaseLinks.length > 0 && (
            <label className={styles.linkNote}>
              <span>Destino público</span>
              <select
                value={selectedPublicationTarget?.targetId ?? ""}
                onChange={(event) => onPublicationTargetIdChange(event.target.value)}
              >
                {publicationCaseLinks.map((link) => (
                  <option key={`${link.id}-${link.targetId}`} value={link.targetId}>
                    {link.targetLabel || link.targetId}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>Decisión</span>
            <select
              value={curationStatus}
              onChange={(event) => onCurationStatusChange(event.target.value as Extract<PublicationStatus, "candidate" | "published_curated">)}
            >
              <option value="candidate">Marcar como candidato a publicación</option>
              <option value="published_curated">Publicar aporte curado</option>
            </select>
          </label>
          <label>
            <span>Título neutral</span>
            <input value={curationTitle} onChange={(event) => onCurationTitleChange(event.target.value)} />
          </label>
          <label className={styles.linkNote}>
            <span>Bajada pública</span>
            <textarea value={curationCaption} onChange={(event) => onCurationCaptionChange(event.target.value)} />
          </label>
          <label className={styles.linkNote}>
            <span>Caveat público</span>
            <textarea value={curationCaveat} onChange={(event) => onCurationCaveatChange(event.target.value)} />
          </label>
          <label>
            <span>Fuente o etiqueta</span>
            <input value={curationSourceLabel} onChange={(event) => onCurationSourceLabelChange(event.target.value)} />
          </label>
          <label>
            <span>Permiso o uso</span>
            <input value={curationPermissionNote} onChange={(event) => onCurationPermissionNoteChange(event.target.value)} />
          </label>
        </div>
        <div className={styles.publicationActions}>
          <button type="button" className={styles.linkButton} onClick={onPromoteContribution} disabled={loading || !canPromote}>
            Guardar curaduría
          </button>
          <button type="button" className={styles.secondaryButton} onClick={onWithdrawCuratedEvidence} disabled={loading || !canWithdraw}>
            Retirar de público
          </button>
        </div>
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
