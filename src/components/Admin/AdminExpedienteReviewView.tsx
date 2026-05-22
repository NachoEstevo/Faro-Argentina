"use client";

import { type FormEvent, useState } from "react";
import { FileText, LockKeyhole, RefreshCw, ShieldAlert } from "lucide-react";

import { formatBytes, formatDate, type Attachment } from "./AdminAportesTypes";
import styles from "./AdminAportesView.module.css";

interface LinkedContribution {
  id: string;
  title: string;
  status: string;
  explanation: string;
  publicSourceUrl: string | null;
  relatedCase: string | null;
  missingVerification: string | null;
  contactName: string | null;
  contactEmail: string | null;
  createdAt: string;
  attachments: Attachment[];
  link: {
    id: string;
    targetType: "case" | "workspace";
    targetId: string;
    targetLabel: string;
    note: string;
    linkedBy: string;
    createdAt: string;
  };
}

interface LinkedPayload {
  target: { type: "case" | "workspace"; id: string; label: string };
  stats: { linkedContributions: number; privateFiles: number };
  contributions: LinkedContribution[];
}

export default function AdminExpedienteReviewView({ caseId }: { caseId: string }) {
  const [accessCode, setAccessCode] = useState("");
  const [payload, setPayload] = useState<LinkedPayload | null>(null);
  const [statusText, setStatusText] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadLinkedMaterial(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setStatusText("Cargando material asociado...");
    try {
      const response = await fetch(
        `/api/admin/aportes/linked?targetType=case&targetId=${encodeURIComponent(caseId)}`,
        { headers: { "x-faro-admin-code": accessCode } },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "No se pudo cargar el material asociado.");
      setPayload(data as LinkedPayload);
      setStatusText("Material asociado actualizado.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "No se pudo cargar el material asociado.");
    } finally {
      setLoading(false);
    }
  }

  async function openAttachment(attachment: Attachment) {
    setStatusText("Abriendo archivo privado...");
    try {
      const response = await fetch(`/api/admin/aportes/attachment?key=${encodeURIComponent(attachment.objectKey)}`, {
        headers: { "x-faro-admin-code": accessCode },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(data?.message ?? "No se pudo abrir el archivo privado.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatusText("Archivo privado abierto.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "No se pudo abrir el archivo privado.");
    }
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.eyebrow}>Admin privado</p>
        <h1>Material asociado</h1>
        <p>No modifica el expediente público. Esta vista sólo reúne aportes privados ya vinculados por el equipo.</p>
        <form className={styles.accessForm} onSubmit={loadLinkedMaterial}>
          <label className={styles.srOnly}>
            <span>Cuenta admin</span>
            <input name="username" autoComplete="username" defaultValue="faro-admin" readOnly tabIndex={-1} />
          </label>
          <label>
            <span>Código privado</span>
            <input
              name="password"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={loading}>
            <LockKeyhole size={15} aria-hidden />
            Abrir material
          </button>
        </form>
        <div className={styles.ruleBox}>
          <ShieldAlert size={17} aria-hidden />
          <span>Los aportes vinculados siguen siendo material de revisión privada.</span>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.toolbar}>
          <div>
            <p className={styles.eyebrow}>Expediente</p>
            <h2>{payload?.target.label ?? caseId}</h2>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={() => loadLinkedMaterial()} disabled={loading || !accessCode}>
            <RefreshCw size={14} aria-hidden />
            Actualizar
          </button>
        </header>
        {statusText && <p className={styles.statusText}>{statusText}</p>}

        {payload ? (
          <>
            <div className={styles.stats}>
              <Metric label="Aportes vinculados" value={payload.stats.linkedContributions} />
              <Metric label="Archivos privados" value={payload.stats.privateFiles} />
              <Metric label="Expediente" value={1} />
              <Metric label="Publicación automática" value={0} />
            </div>
            <div className={styles.materialList}>
              {payload.contributions.length === 0 ? (
                <p className={styles.empty}>Todavía no hay aportes privados vinculados a este expediente.</p>
              ) : payload.contributions.map((contribution) => (
                <article key={`${contribution.id}-${contribution.link.id}`} className={styles.materialItem}>
                  <span>{formatDate(contribution.link.createdAt)} · {contribution.link.linkedBy}</span>
                  <h3>{contribution.title}</h3>
                  <p>{contribution.explanation}</p>
                  {contribution.link.note && <p>{contribution.link.note}</p>}
                  <dl className={styles.facts}>
                    <Fact label="Aporte" value={contribution.id} />
                    <Fact label="Contacto" value={[contribution.contactName, contribution.contactEmail].filter(Boolean).join(" · ")} />
                    <Fact label="Fuente pública" value={contribution.publicSourceUrl} href={contribution.publicSourceUrl} />
                    <Fact label="Falta verificar" value={contribution.missingVerification} />
                  </dl>
                  <div className={styles.files}>
                    <h4>Archivos</h4>
                    {contribution.attachments.length === 0 ? (
                      <p className={styles.empty}>Sin archivos privados.</p>
                    ) : contribution.attachments.map((attachment) => (
                      <button key={attachment.id} type="button" onClick={() => openAttachment(attachment)}>
                        <FileText size={14} aria-hidden />
                        Abrir archivo privado · {attachment.originalFilename} · {formatBytes(attachment.sizeBytes)}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <ShieldAlert size={22} aria-hidden />
            <p>Ingresá el código privado para ver aportes vinculados a este expediente.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong></div>;
}

function Fact({ label, value, href }: { label: string; value?: string | null; href?: string | null }) {
  if (!value) return null;
  return <div><dt>{label}</dt><dd>{href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : value}</dd></div>;
}
