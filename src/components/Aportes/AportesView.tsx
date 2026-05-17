"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FilePlus2,
  FileSearch,
  Flag,
  FolderOpen,
  Link as LinkIcon,
  Map as MapIcon,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import styles from "./AportesView.module.css";

interface Props {
  selectedCountry: "AR" | "PE" | "CL";
  onSwitchToMap: () => void;
  onSwitchToExplorer: () => void;
  onSwitchToInvestigations: () => void;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

const contributionTypes = [
  {
    id: "suggest_lead",
    label: "Sugerir pista",
    description: "Un registro publico que deberiamos revisar.",
    icon: FileSearch,
  },
  {
    id: "add_source",
    label: "Agregar fuente",
    description: "Un link oficial o documento publico faltante.",
    icon: LinkIcon,
  },
  {
    id: "correct_data",
    label: "Corregir dato",
    description: "Un campo visible que parece incompleto o errado.",
    icon: FilePlus2,
  },
  {
    id: "add_photo",
    label: "Subir foto",
    description: "Material propio para revision privada.",
    icon: Camera,
  },
  {
    id: "report_issue",
    label: "Reportar problema",
    description: "Algo roto, confuso o imposible de verificar.",
    icon: AlertTriangle,
  },
] as const;

export default function AportesView({ selectedCountry, onSwitchToMap, onSwitchToExplorer, onSwitchToInvestigations }: Props) {
  const [type, setType] = useState<(typeof contributionTypes)[number]["id"]>("add_photo");
  const [jurisdiction, setJurisdiction] = useState(selectedCountry);
  const [files, setFiles] = useState<File[]>([]);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [statusText, setStatusText] = useState("");

  const fileSummary = useMemo(
    () => files.map((file) => `${file.name} · ${formatBytes(file.size)}`),
    [files],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("type", type);
    form.set("jurisdiction", jurisdiction);
    files.forEach((file) => form.append("attachments", file));
    setSubmitState("submitting");
    setStatusText("Enviando aporte para revision privada...");

    try {
      const response = await fetch("/api/aportes", { method: "POST", body: form });
      const payload = await response.json() as {
        submissionId?: string;
        errors?: Array<{ message: string }>;
        message?: string;
      };
      if (!response.ok) {
        const message = payload.errors?.map((error) => error.message).join(" ") || payload.message;
        throw new Error(message || "No se pudo enviar el aporte.");
      }
      setSubmitState("success");
      setStatusText(`Aporte recibido para revision: ${payload.submissionId}.`);
      formElement.reset();
      setFiles([]);
    } catch (error) {
      setSubmitState("error");
      setStatusText(formatSubmitFailureMessage(error));
    }
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files ?? []).slice(0, 5);
    setFiles(selected);
  }

  return (
    <section className={styles.shell} aria-label="Aportes">
      <aside className={styles.sidebar}>
        <div className={styles.modeSwitch} role="group" aria-label="Modo de exploracion">
          <button type="button" className={styles.modeButton} onClick={onSwitchToMap}>
            <MapIcon size={13} aria-hidden />
            Mapa
          </button>
          <button type="button" className={styles.modeButton} onClick={onSwitchToExplorer}>
            <FileSearch size={13} aria-hidden />
            Explorer
          </button>
          <button type="button" className={`${styles.modeButton} ${styles.activeMode}`} aria-pressed="true">
            <MessageSquarePlus size={13} aria-hidden />
            Aportes
          </button>
          <button type="button" className={styles.modeButton} onClick={onSwitchToInvestigations}>
            <FolderOpen size={13} aria-hidden />
            Investigaciones
          </button>
        </div>
        <p className={styles.eyebrow}>Revision privada</p>
        <h1 className={styles.title}>Ayudanos a mejorar Faro</h1>
        <p className={styles.intro}>
          Aporta una fuente, subi una foto, corregi un dato o sugeri una pista verificable.
          Todo lo enviado pasa por revision antes de usarse en Faro.
        </p>
        <div className={styles.rules} aria-label="Reglas de revision">
          <div className={styles.rule}>
            <ShieldCheck size={18} aria-hidden />
            <span>Material aportado por usuario: privado hasta que el equipo lo revise.</span>
          </div>
          <div className={styles.rule}>
            <Flag size={18} aria-hidden />
            <span>No se publica automaticamente en mapa, Explorer, informes o exports.</span>
          </div>
        </div>
      </aside>
      <div className={styles.content}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <section className={styles.section} aria-labelledby="aporte-tipo">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle} id="aporte-tipo">Tipo de aporte</h2>
              <p className={styles.sectionHint}>Elegi el camino mas cercano. Todo entra a la misma revision.</p>
            </div>
            <div className={styles.typeGrid}>
              {contributionTypes.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.typeButton} ${type === option.id ? styles.typeActive : ""}`}
                    onClick={() => setType(option.id)}
                    aria-pressed={type === option.id}
                  >
                    <Icon size={17} aria-hidden />
                    <span className={styles.typeLabel}>{option.label}</span>
                    <span className={styles.typeDescription}>{option.description}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <section className={styles.section} aria-labelledby="aporte-datos">
            <h2 className={styles.sectionTitle} id="aporte-datos">Datos para revisar</h2>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span className={styles.label}>Titulo neutral</span>
                <input className={styles.input} name="title" required maxLength={140} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Pais o jurisdiccion</span>
                <select
                  className={styles.select}
                  value={jurisdiction}
                  onChange={(event) => setJurisdiction(event.target.value as "AR" | "PE" | "CL")}
                >
                  <option value="AR">Argentina</option>
                  <option value="PE">Peru</option>
                  <option value="CL">Chile</option>
                </select>
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.label}>Que aporta o que deberiamos revisar</span>
                <textarea className={styles.textarea} name="explanation" required />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Link publico u oficial</span>
                <input className={styles.input} name="publicSourceUrl" type="url" inputMode="url" />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Caso Faro relacionado</span>
                <input className={styles.input} name="relatedCase" placeholder="ID o URL del caso" />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Ubicacion aproximada</span>
                <input className={styles.input} name="approximateLocation" />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Fecha de la foto o dato</span>
                <input className={styles.input} name="capturedAt" type="date" />
              </label>
            </div>
          </section>
          <section className={styles.section} aria-labelledby="aporte-fotos">
            <h2 className={styles.sectionTitle} id="aporte-fotos">Fotos privadas</h2>
            <div className={styles.dropzone}>
              <label className={styles.field}>
                <span className={styles.label}>JPG, PNG o WebP. Hasta 5 archivos, 10 MB cada uno.</span>
                <input
                  className={styles.fileInput}
                  name="attachmentsInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFiles}
                />
              </label>
              {fileSummary.length > 0 && (
                <div className={styles.fileList} aria-label="Archivos seleccionados">
                  {fileSummary.map((label) => (
                    <span key={label} className={styles.fileChip}>
                      <UploadCloud size={14} aria-hidden />
                      <span>{label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
          <section className={styles.section} aria-labelledby="aporte-contacto">
            <h2 className={styles.sectionTitle} id="aporte-contacto">Contacto y confirmacion</h2>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span className={styles.label}>Nombre</span>
                <input className={styles.input} name="contactName" />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input className={styles.input} name="contactEmail" type="email" />
              </label>
            </div>
            <div className={styles.checks}>
              <label className={styles.checkRow}>
                <input name="sourcePermissionConfirmed" type="checkbox" value="true" required />
                <span>La informacion viene de fuentes publicas o de material propio que puedo compartir con Faro.</span>
              </label>
              <label className={styles.checkRow}>
                <input name="reviewConfirmed" type="checkbox" value="true" required />
                <span>Entiendo que el aporte entra a revision y no se publica automaticamente.</span>
              </label>
            </div>
          </section>
          <div className={styles.actions}>
            <button className={styles.submit} type="submit" disabled={submitState === "submitting"}>
              {submitState === "success" ? <CheckCircle2 size={16} aria-hidden /> : <Send size={16} aria-hidden />}
              Enviar aporte para revision
            </button>
            {statusText && (
              <p className={`${styles.status} ${submitState === "error" ? styles.statusError : ""} ${submitState === "success" ? styles.statusSuccess : ""}`}>
                {statusText}
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function formatSubmitFailureMessage(error: unknown): string {
  const fallback = "No pudimos enviar el aporte. Revisa los datos y volve a intentar.";
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message) return fallback;
  if (/cannot read|undefined|null|failed to fetch|networkerror|syntaxerror|json/i.test(message)) {
    return fallback;
  }
  return message;
}
