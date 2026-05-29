"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  FilePlus2,
  Flag,
  Link as LinkIcon,
  Send,
  ShieldCheck,
  UserRoundX,
  UploadCloud,
} from "lucide-react";

import FaroMark from "../FaroMark";
import styles from "./AportesView.module.css";

interface Props {
  selectedCountry: "AR";
}

type SubmitState = "idle" | "submitting" | "success" | "error";
type PrivacyMode = "anonymous" | "contact";

const contributionTypes = [
  {
    id: "add_source",
    label: "Agregar fuente",
    description: "Un link oficial o público que falta revisar.",
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
    label: "Subir archivo o foto",
    description: "Material propio para revisión privada.",
    icon: Camera,
  },
] as const;

type ContributionTypeId = (typeof contributionTypes)[number]["id"];

const formCopy: Record<ContributionTypeId, {
  heading: string;
  hint: string;
  titleLabel: string;
  titlePlaceholder: string;
  explanationLabel: string;
  explanationPlaceholder: string;
  fileTitle: string;
  fileHint: string;
}> = {
  add_source: {
    heading: "Paso 2 · Fuente para revisar",
    hint: "La fuente es el centro de este aporte. Preferimos links oficiales, documentos públicos o páginas verificables.",
    titleLabel: "Nombre neutral de la fuente",
    titlePlaceholder: "Ej. Acta de adjudicación publicada",
    explanationLabel: "Qué dato aporta esta fuente",
    explanationPlaceholder: "Explicá qué debería revisar Faro y cómo se relaciona con un expediente o tema.",
    fileTitle: "Archivo de respaldo opcional",
    fileHint: "Si además tenés PDF o captura propia, podés adjuntarla para revisión privada.",
  },
  correct_data: {
    heading: "Paso 2 · Corrección de dato",
    hint: "Marcá el expediente, el campo que parece incorrecto y la fuente que respalda la corrección.",
    titleLabel: "Resumen de la corrección",
    titlePlaceholder: "Ej. Monto oficial incompleto en expediente",
    explanationLabel: "Por qué habría que corregirlo",
    explanationPlaceholder: "Describí el dato visible, el problema y la fuente que permite verificarlo.",
    fileTitle: "Respaldo privado opcional",
    fileHint: "Podés adjuntar captura o documento de respaldo si ayuda a revisar la corrección.",
  },
  add_photo: {
    heading: "Paso 2 · Archivo o foto",
    hint: "El archivo necesita contexto mínimo: ubicación, fecha si la tenés y por qué ayuda a revisar.",
    titleLabel: "Título neutral del material",
    titlePlaceholder: "Ej. Cartel de obra visible en ruta",
    explanationLabel: "Qué muestra el archivo",
    explanationPlaceholder: "Describí qué se ve, desde dónde se tomó y qué expediente o dato podría ayudar a revisar.",
    fileTitle: "Archivo o foto del aporte",
    fileHint: "JPG, PNG, WebP o PDF. Hasta 5 archivos, 10 MB cada uno.",
  },
};

const aporteSteps = [
  { eyebrow: "Paso 1", title: "Tipo de aporte", detail: "Elegí la categoría más cercana." },
  { eyebrow: "Paso 2", title: "Datos necesarios", detail: "Completá lo que pide ese tipo de aporte." },
  { eyebrow: "Paso 3", title: "Revisión", detail: "Confirmá permisos y contacto opcional." },
] as const;

export default function AportesView({ selectedCountry }: Props) {
  const [type, setType] = useState<ContributionTypeId>("add_source");
  const [jurisdiction, setJurisdiction] = useState(selectedCountry);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>("anonymous");
  const [files, setFiles] = useState<File[]>([]);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [statusText, setStatusText] = useState("");
  const selectedCopy = formCopy[type];

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
    form.set("privacyMode", privacyMode);
    if (privacyMode === "anonymous") {
      form.set("contactName", "");
      form.set("contactEmail", "");
    }
    files.forEach((file) => form.append("attachments", file));
    setSubmitState("submitting");
    setStatusText("Enviando aporte para revisión privada...");

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
      setStatusText(`Aporte recibido para revisión: ${payload.submissionId}.`);
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
        <header className={styles.sidebarBrand}>
          <div className={styles.sidebarBrandIdentity}>
            <FaroMark compact />
            <span className={styles.sidebarBrandName}>Faro</span>
          </div>
        </header>
        <p className={styles.eyebrow}>Revisión privada</p>
        <h1 className={styles.title}>Ayudanos a mejorar Faro</h1>
        <p className={styles.intro}>
          Aportá una fuente, corregí un dato visible o subí material propio para revisión.
          Todo material enviado pasa por revisión antes de usarse en Faro.
        </p>
        <div className={styles.rules} aria-label="Reglas de revisión">
          <div className={styles.rule}>
            <ShieldCheck size={18} aria-hidden />
            <span>Material aportado por usuario: privado hasta que el equipo lo revise.</span>
          </div>
          <div className={styles.rule}>
            <Flag size={18} aria-hidden />
            <span>No se publica automáticamente en mapa, Explorar, informes o exports.</span>
          </div>
        </div>
      </aside>
      <div className={styles.content}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <ol className={styles.stepper} aria-label="Pasos del aporte">
            {aporteSteps.map((step) => (
              <li key={step.eyebrow} className={styles.step}>
                <span className={styles.stepEyebrow}>{step.eyebrow}</span>
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </li>
            ))}
          </ol>

          <section className={styles.section} aria-labelledby="aporte-tipo">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle} id="aporte-tipo">Paso 1 · Tipo de aporte</h2>
              <p className={styles.sectionHint}>Tres caminos claros. Todo entra a revisión privada.</p>
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
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle} id="aporte-datos">{selectedCopy.heading}</h2>
              <p className={styles.sectionHint}>{selectedCopy.hint}</p>
            </div>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span className={styles.label}>{selectedCopy.titleLabel}</span>
                <input
                  className={styles.input}
                  name="title"
                  required
                  maxLength={140}
                  aria-label={selectedCopy.titleLabel}
                  placeholder={selectedCopy.titlePlaceholder}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>País o jurisdicción</span>
                <select
                  className={styles.select}
                  value={jurisdiction}
                  onChange={(event) => setJurisdiction(event.target.value as "AR")}
                >
                  <option value="AR">Argentina</option>
                </select>
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.label}>{selectedCopy.explanationLabel}</span>
                <textarea
                  className={styles.textarea}
                  name="explanation"
                  required
                  aria-label={selectedCopy.explanationLabel}
                  placeholder={selectedCopy.explanationPlaceholder}
                />
              </label>
              {type === "add_source" && (
                <>
                  <label className={styles.field}>
                    <span className={styles.label}>Link oficial o público</span>
                    <input className={styles.input} name="publicSourceUrl" type="url" inputMode="url" required placeholder="https://..." />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Caso Faro relacionado</span>
                    <input className={styles.input} name="relatedCase" placeholder="ID o URL del caso si existe" />
                  </label>
                </>
              )}
              {type === "correct_data" && (
                <>
                  <label className={styles.field}>
                    <span className={styles.label}>Caso Faro relacionado</span>
                    <input className={styles.input} name="relatedCase" required placeholder="ID o URL del expediente" />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Fuente que respalda la corrección</span>
                    <input className={styles.input} name="publicSourceUrl" type="url" inputMode="url" required placeholder="https://..." />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Campo a corregir</span>
                    <input className={styles.input} name="missingVerification" required placeholder="Monto, proveedor, fecha, ubicación..." />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Valor sugerido</span>
                    <input className={styles.input} name="amountOrDate" required placeholder="Dato corregido o explicación breve" />
                  </label>
                </>
              )}
              {type === "add_photo" && (
                <>
                  <label className={styles.field}>
                    <span className={styles.label}>Ubicación aproximada</span>
                    <input className={styles.input} name="approximateLocation" required placeholder="Provincia, localidad o referencia" />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Fecha de la foto o dato</span>
                    <input className={styles.input} name="capturedAt" type="date" />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Caso Faro relacionado</span>
                    <input className={styles.input} name="relatedCase" placeholder="ID o URL si lo conocés" />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Link público u oficial</span>
                    <input className={styles.input} name="publicSourceUrl" type="url" inputMode="url" placeholder="Opcional" />
                  </label>
                </>
              )}
            </div>
            <h3 className={styles.subsectionTitle}>{selectedCopy.fileTitle}</h3>
            <div className={styles.dropzone}>
              <label className={styles.field}>
                <span className={styles.label}>{selectedCopy.fileHint}</span>
                <input
                  className={styles.fileInput}
                  name="attachmentsInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  multiple
                  required={type === "add_photo" && files.length === 0}
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
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle} id="aporte-contacto">Paso 3 · Revisión y contacto</h2>
              <p className={styles.sectionHint}>Faro guarda esto como material privado hasta que el equipo lo valide.</p>
            </div>
            <fieldset className={styles.privacyModes}>
              <legend className={styles.srOnly}>Modo de contacto</legend>
              <label className={`${styles.privacyMode} ${privacyMode === "anonymous" ? styles.privacyModeActive : ""}`}>
                <input
                  type="radio"
                  name="privacyMode"
                  value="anonymous"
                  checked={privacyMode === "anonymous"}
                  onChange={() => setPrivacyMode("anonymous")}
                />
                <UserRoundX size={17} aria-hidden />
                <span className={styles.privacyModeTitle}>Enviar sin contacto</span>
                <span className={styles.privacyModeText}>No pedimos nombre ni email para este aporte.</span>
              </label>
              <label className={`${styles.privacyMode} ${privacyMode === "contact" ? styles.privacyModeActive : ""}`}>
                <input
                  type="radio"
                  name="privacyMode"
                  value="contact"
                  checked={privacyMode === "contact"}
                  onChange={() => setPrivacyMode("contact")}
                />
                <ShieldCheck size={17} aria-hidden />
                <span className={styles.privacyModeTitle}>Permitir contacto</span>
                <span className={styles.privacyModeText}>Requiere email para poder pedir contexto adicional.</span>
              </label>
            </fieldset>
            <div className={styles.securityNote}>
              <ShieldCheck size={16} aria-hidden />
              <p>
                Sin contacto no significa anonimato absoluto: navegador, red, hosting o requerimientos legales pueden generar metadata tecnica. Ver{" "}
                <Link href="/seguridad">seguridad y anonimato</Link>.
                Al recibir un archivo sin contacto, Faro guarda un nombre neutralizado en el manifiesto interno, pero el contenido puede conservar metadatos EXIF o PDF.
              </p>
            </div>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span className={styles.label}>Nombre</span>
                <input className={styles.input} name="contactName" disabled={privacyMode === "anonymous"} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input
                  className={styles.input}
                  name="contactEmail"
                  type="email"
                  required={privacyMode === "contact"}
                  disabled={privacyMode === "anonymous"}
                />
              </label>
            </div>
            <div className={styles.checks}>
              <label className={styles.checkRow}>
                <input name="sourcePermissionConfirmed" type="checkbox" value="true" required />
                <span>La información viene de fuentes públicas o de material propio que puedo compartir con Faro.</span>
              </label>
              <label className={styles.checkRow}>
                <input name="reviewConfirmed" type="checkbox" value="true" required />
                <span>Entiendo que el aporte entra a revisión y no se publica automáticamente.</span>
              </label>
            </div>
            <p className={styles.policyLinks}>
              Antes de enviar, revisá la <Link href="/aportes/politica">política de aportes</Link>, la{" "}
              <Link href="/privacidad">privacidad</Link> y los <Link href="/terminos">términos</Link>.
            </p>
          </section>
          <div className={styles.actions}>
            <button className={styles.submit} type="submit" disabled={submitState === "submitting"}>
              {submitState === "success" ? <CheckCircle2 size={16} aria-hidden /> : <Send size={16} aria-hidden />}
              Enviar aporte para revisión
            </button>
            {statusText && (
              <p
                className={`${styles.status} ${submitState === "error" ? styles.statusError : ""} ${submitState === "success" ? styles.statusSuccess : ""}`}
                aria-live="polite"
              >
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
  const fallback = "No pudimos enviar el aporte. Revisá los datos y volvé a intentar.";
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message) return fallback;
  if (/cannot read|undefined|null|failed to fetch|networkerror|syntaxerror|json/i.test(message)) {
    return fallback;
  }
  return message;
}
