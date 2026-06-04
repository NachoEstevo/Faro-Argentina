"use client";

import type { FormEvent } from "react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {
  CloudDownload,
  CloudUpload,
  Download,
  LogIn,
  Plus,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";

import FaroMark from "../FaroMark";
import SearchSuggestionGroups from "../SearchSuggestionGroups";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { SearchSuggestion } from "@/lib/data/searchSuggestions";
import type { InvestigationDossier } from "@/lib/data/investigationDossiers";
import type { InvestigationDossierReadiness } from "@/lib/data/investigationReadiness";
import {
  getInvestigationRelationReasonLabel,
  type InvestigationAggregate,
  type InvestigationCaseRelationReason,
  type InvestigationReadinessGate,
  type InvestigationVerificationTaskStatus,
  type InvestigationWorkspace,
} from "@/lib/data/investigationWorkspaces";
import { parseInvestigationAnalysisBlocks } from "@/lib/data/investigationAnalysisText";
import styles from "./InvestigationsView.module.css";

interface SidebarProps {
  workspaces: InvestigationWorkspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  onLoadServerWorkspaces: () => void;
  onSaveServerWorkspaces: () => void;
  syncLoading: boolean;
  syncSaving: boolean;
  syncStatusText: string;
  syncIsError: boolean;
}

interface CreateFormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

interface AnalysisPanelProps {
  accessCode: string;
  onAccessCodeChange: (value: string) => void;
  onAnalyze: () => void;
  analysisLoading: boolean;
  caseCount: number;
  statusText: string;
  isError: boolean;
  aggregate: InvestigationAggregate | null;
  analysisMarkdown?: string;
}

interface WorkspaceHeaderProps {
  workspace: InvestigationWorkspace;
}

interface DossierBuilderPanelProps {
  dossier: InvestigationDossier | null;
  caseCount: number;
  onSaveNextStepsAsNote: (steps: string[]) => void;
  onSaveNextStepsAsTasks: (steps: string[]) => void;
}

interface VerificationTasksPanelProps {
  workspace: InvestigationWorkspace;
  readiness: InvestigationReadinessGate | null;
  onAddTask: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateTaskStatus: (taskId: string, status: InvestigationVerificationTaskStatus) => void;
}

interface CaseSearchPanelProps {
  query: string;
  relationReason: InvestigationCaseRelationReason;
  relationNote: string;
  results: ExplorerCase[];
  searchSuggestions: SearchSuggestion[];
  investigationQuestion: string | null;
  relationReasonOptions: Array<{ value: InvestigationCaseRelationReason; label: string }>;
  onQueryChange: (value: string) => void;
  onSelectSearchSuggestion: (suggestion: SearchSuggestion) => void;
  onRelationReasonChange: (value: InvestigationCaseRelationReason) => void;
  onRelationNoteChange: (value: string) => void;
  onAddCase: (caseId: string, reason: InvestigationCaseRelationReason, note: string) => void;
}

interface SelectedCasesPanelProps {
  selectedCases: ExplorerCase[];
  workspace: InvestigationWorkspace;
  onRemoveCase: (caseId: string) => void;
}

export type WorkspaceTab = "resumen" | "expedientes" | "notas" | "analisis" | "exportar";

const WORKSPACE_TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "resumen", label: "Plan" },
  { id: "expedientes", label: "Evidencia" },
  { id: "notas", label: "Notas" },
  { id: "analisis", label: "Análisis" },
  { id: "exportar", label: "Exportar" },
];

export function InvestigationsSidebar({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onLoadServerWorkspaces,
  onSaveServerWorkspaces,
  syncLoading,
  syncSaving,
  syncStatusText,
  syncIsError,
}: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <header className={styles.sidebarBrand}>
        <div className={styles.sidebarBrandIdentity}>
          <FaroMark compact />
          <span className={styles.sidebarBrandName}>Faro</span>
        </div>
      </header>
      <div className={styles.sidebarIntro}>
        <p className={styles.eyebrow}>Carpetas privadas</p>
        <h1 className={styles.title}>Mesa de investigación</h1>
        <p className={styles.intro}>
          Reuní expedientes, fuentes, notas y tareas verificables sin publicar hipótesis.
        </p>
      </div>
      <div className={styles.rules}>
        <span>Local por defecto</span>
        <span>Sin publicación automática</span>
      </div>
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={onSelectWorkspace}
        onCreateWorkspace={onCreateWorkspace}
      />
      <WorkspaceSyncPanel
        onLoad={onLoadServerWorkspaces}
        onSave={onSaveServerWorkspaces}
        loading={syncLoading}
        saving={syncSaving}
        statusText={syncStatusText}
        isError={syncIsError}
        workspaceCount={workspaces.length}
      />
    </aside>
  );
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
}: {
  workspaces: InvestigationWorkspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
}) {
  return (
    <div className={styles.workspaceSwitcher}>
      <div className={styles.switcherHeader}>
        <span>Carpetas guardadas</span>
        <button type="button" onClick={onCreateWorkspace}>
          <Plus size={13} aria-hidden />
          Nueva carpeta
        </button>
      </div>
      {workspaces.length === 0 ? (
        <p className={styles.switcherEmpty}>Creá una carpeta para empezar a reunir expedientes.</p>
      ) : (
        <div className={styles.workspaceList} aria-label="Carpetas guardadas">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              className={`${styles.workspaceOption} ${workspace.id === activeWorkspaceId ? styles.workspaceOptionActive : ""}`}
              onClick={() => onSelectWorkspace(workspace.id)}
              aria-label={`Seleccionar carpeta ${workspace.title}`}
            >
              <strong>{workspace.title}</strong>
              <small>{workspace.caseIds.length} expedientes · {workspace.notes.length} notas</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspaceSyncPanel({
  onLoad,
  onSave,
  loading,
  saving,
  statusText,
  isError,
  workspaceCount,
}: {
  onLoad: () => void;
  onSave: () => void;
  loading: boolean;
  saving: boolean;
  statusText: string;
  isError: boolean;
  workspaceCount: number;
}) {
  const { isLoaded, user } = useUser();
  const isBusy = loading || saving || !isLoaded;
  const accountLabel = user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? "Cuenta activa";
  return (
    <details className={styles.syncPanel} aria-label="Cuenta privada">
      <summary className={styles.syncHeader}>
        <span>
          <UserRound size={13} aria-hidden />
          Cuenta privada
        </span>
        <small>{workspaceCount} carpeta{workspaceCount === 1 ? "" : "s"}</small>
      </summary>
      {!user && (
        <p className={styles.syncCopy}>
          Podés trabajar localmente. Iniciá sesión para guardar y recuperar carpetas entre dispositivos.
        </p>
      )}
      {!user && (
        <SignInButton mode="modal">
          <button className={styles.primary} type="button">
            <LogIn size={14} aria-hidden />
            Iniciar sesión
          </button>
        </SignInButton>
      )}
      {user && (
        <div className={styles.accountRow}>
          <UserButton />
          <span>{accountLabel}</span>
        </div>
      )}
      {user && (
        <p className={styles.syncCopy}>
          Guardá esta selección en tu cuenta o cargá la última versión sincronizada.
        </p>
      )}
      {user && (
        <div className={styles.syncActions}>
          <button className={styles.secondary} type="button" onClick={onLoad} disabled={isBusy}>
            <CloudDownload size={14} aria-hidden />
            Cargar cuenta
          </button>
          <button className={styles.secondary} type="button" onClick={onSave} disabled={isBusy}>
            <CloudUpload size={14} aria-hidden />
            Guardar cuenta
          </button>
        </div>
      )}
      {statusText && <p className={isError ? styles.error : styles.status}>{statusText}</p>}
    </details>
  );
}

export function CreateWorkspaceForm({ onSubmit }: CreateFormProps) {
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Nueva carpeta</p>
          <h2>Crear carpeta de investigación</h2>
          <p>Definí una pregunta de trabajo antes de reunir expedientes, fuentes y notas.</p>
        </div>
      </header>
      <label className={styles.field}>
        <span>Título</span>
        <input className={styles.input} name="title" required maxLength={120} placeholder="Causa Vialidad" />
      </label>
      <label className={styles.fieldWide}>
        <span>Pregunta de trabajo</span>
        <textarea className={styles.textarea} name="question" placeholder="Qué queremos verificar?" />
      </label>
      <label className={styles.fieldWide}>
        <span>Descripción neutral</span>
        <textarea className={styles.textarea} name="description" />
      </label>
      <label className={styles.field}>
        <span>Tags separados por coma</span>
        <input className={styles.input} name="tags" />
      </label>
      <button className={styles.primary} type="submit">
        <Plus size={15} aria-hidden />
        Crear carpeta
      </button>
    </form>
  );
}

export function InvestigationAnalysisPanel({
  accessCode,
  onAccessCodeChange,
  onAnalyze,
  analysisLoading,
  caseCount,
  statusText,
  isError,
  aggregate,
  analysisMarkdown,
}: AnalysisPanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h3>Análisis de trabajo</h3>
          <p>Genera una lectura auxiliar del paquete. No reemplaza fuentes, caveats ni revisión humana.</p>
        </div>
      </div>
      <div className={styles.analysisControls}>
        <input
          className={styles.input}
          value={accessCode}
          onChange={(event) => onAccessCodeChange(event.target.value)}
          placeholder="Código de acceso"
        />
        <button
          className={styles.primary}
          type="button"
          onClick={onAnalyze}
          disabled={analysisLoading || caseCount === 0}
        >
          <Send size={15} aria-hidden />
          Generar análisis de trabajo
        </button>
      </div>
      {statusText && <p className={isError ? styles.error : styles.status}>{statusText}</p>}
      {aggregate && (
        <div className={styles.metrics}>
          <span>{aggregate.caseCount} expedientes</span>
          <span>{aggregate.sourceIds.length} fuentes</span>
          <span>{aggregate.geometryGaps.count} brechas de geometría</span>
        </div>
      )}
      {analysisMarkdown && <AnalysisMarkdown markdown={analysisMarkdown} />}
    </section>
  );
}

function AnalysisMarkdown({ markdown }: { markdown: string }) {
  const blocks = parseInvestigationAnalysisBlocks(markdown);
  return (
    <article className={styles.analysisReport} aria-label="Informe de análisis">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <h4 key={`${block.type}-${index}`}>{block.text}</h4>;
        }
        if (block.type === "list") {
          return (
            <ul key={`${block.type}-${index}`}>
              {block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}
            </ul>
          );
        }
        if (block.type === "table") {
          return (
            <div className={styles.analysisTableWrap} key={`${block.type}-${index}`}>
              <table className={styles.analysisTable}>
                <thead>
                  <tr>
                    {block.headers.map((header, headerIndex) => (
                      <th key={`${header}-${headerIndex}`}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${cell}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={`${block.type}-${index}`}>{block.text}</p>;
      })}
    </article>
  );
}

export function WorkspaceHeader({ workspace }: WorkspaceHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Carpeta activa</p>
        <h2>{workspace.title}</h2>
        <p>{workspace.description || "Carpeta local de trabajo."}</p>
      </div>
      <div className={styles.headerMeta} aria-label="Resumen de carpeta">
        <span>
          <strong>{workspace.caseIds.length}</strong>
          expedientes
        </span>
        <span>
          <strong>{workspace.verificationTasks.length}</strong>
          tareas
        </span>
      </div>
    </header>
  );
}

export function WorkspaceTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Secciones de carpeta">
      {WORKSPACE_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function WorkspaceExportPanel({
  workspace,
  aggregate,
  dossierReadiness,
  onExport,
}: {
  workspace: InvestigationWorkspace;
  aggregate: InvestigationAggregate | null;
  dossierReadiness: InvestigationDossierReadiness | null;
  onExport: () => void;
}) {
  return (
    <section className={`${styles.panel} ${styles.exportPanel}`}>
      <div className={styles.panelHeading}>
        <div>
          <h3>Paquete descargable</h3>
          <p>ZIP privado con dossier, matriz de evidencia, fuentes, notas, tareas y análisis disponible.</p>
        </div>
      </div>
      <div className={styles.exportManifest}>
        <span>Dossier de trabajo</span>
        <span>Matriz CSV</span>
        <span>Notas y fuentes</span>
        <span>Plan de verificación</span>
      </div>
      <div className={styles.metrics}>
        <span>{workspace.caseIds.length} expedientes</span>
        <span>{workspace.notes.length} notas</span>
        <span>{workspace.sourceLinks.length} fuentes manuales</span>
        {aggregate && <span>{aggregate.sourceIds.length} fuentes en expedientes</span>}
      </div>
      {dossierReadiness && (
        <div className={styles.exportReadiness}>
          <span>Preparación</span>
          <strong>{dossierReadiness.label}</strong>
          <p>{dossierReadiness.summary}</p>
          {dossierReadiness.blockers.length > 0 && (
            <ul>
              {dossierReadiness.blockers.slice(0, 3).map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          )}
        </div>
      )}
      <button className={styles.primary} type="button" onClick={onExport}>
        <Download size={15} aria-hidden />
        Exportar carpeta ZIP
      </button>
    </section>
  );
}

export function DossierBuilderPanel({
  dossier,
  caseCount,
  onSaveNextStepsAsNote,
  onSaveNextStepsAsTasks,
}: DossierBuilderPanelProps) {
  if (!dossier) {
    return (
      <section className={styles.panel}>
        <div className={styles.emptyState}>
          <h3>Dossier de trabajo</h3>
          <p>
            {caseCount > 0
              ? "Cargando matriz de evidencia con los expedientes guardados."
              : "Agregá expedientes para construir una matriz de evidencia."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h3>Dossier de trabajo</h3>
          <p>Ordena evidencia oficial, relación declarada, brechas y próximos pasos. No publica ni concluye por sí solo.</p>
        </div>
      </div>
      <div className={styles.dossierStats} aria-label="Resumen del dossier">
        <span>
          <strong>{dossier.matrix.length}</strong>
          expedientes
        </span>
        <span>
          <strong>{dossier.actors.length}</strong>
          actores comunes
        </span>
        <span>
          <strong>{dossier.gaps.length}</strong>
          brechas
        </span>
        <span>
          <strong>{dossier.nextSteps.length}</strong>
          próximos pasos
        </span>
      </div>
      <div className={styles.dossierGrid}>
        <div className={styles.dossierMatrix}>
          <div className={styles.dossierSectionHead}>
            <h4>Matriz de evidencia</h4>
            <span>{dossier.matrix.length} expediente{dossier.matrix.length === 1 ? "" : "s"}</span>
          </div>
          {dossier.matrix.length === 0 ? (
            <p className={styles.empty}>Sin expedientes seleccionados.</p>
          ) : (
            dossier.matrix.map((row) => (
              <details key={row.caseId} className={styles.matrixRow}>
                <summary className={styles.matrixSummary}>
                  <span className={styles.matrixCaseId}>{row.caseId}</span>
                  <strong>{row.title}</strong>
                  <span className={styles.matrixRelation}>{row.relation}</span>
                  <span className={styles.matrixGap}>{summarizeDossierGap(row.gap)}</span>
                </summary>
                <div className={styles.matrixBody}>
                  <div>
                    <b>Evidencia oficial</b>
                    <p>{row.officialEvidence}</p>
                    <a className={styles.matrixAction} href={row.officialSourceUrl} target="_blank" rel="noreferrer">
                      Abrir fuente oficial
                    </a>
                  </div>
                  <div><b>Contexto del usuario</b><p>{row.userContext}</p></div>
                  <div><b>Caveat</b><p>{row.caveat}</p></div>
                  <div><b>Brecha</b><p>{row.gap}</p></div>
                  <div><b>Próximo paso</b><p>{row.nextStep}</p></div>
                </div>
              </details>
            ))
          )}
        </div>
        <div className={styles.dossierSide}>
          <DossierList
            title="Actores comunes"
            emptyText="Sin actores repetidos o cargados."
            items={dossier.actors.slice(0, 5).map((actor) =>
              `${actor.kind}: ${actor.label} · ${actor.count} expediente${actor.count === 1 ? "" : "s"} · Base de identidad: ${actor.basis}`
            )}
          />
          <DossierList
            title="Brechas para verificar"
            emptyText="Sin brechas automáticas."
            items={dossier.gaps}
          />
          <DossierList
            title="Próximos pasos"
            emptyText="Sin próximos pasos."
            items={dossier.nextSteps}
          />
          <button
            className={styles.secondary}
            type="button"
            onClick={() => onSaveNextStepsAsTasks(dossier.nextSteps)}
            disabled={dossier.nextSteps.length === 0}
          >
            Guardar próximos pasos como tareas
          </button>
          <button
            className={styles.ghostButton}
            type="button"
            onClick={() => onSaveNextStepsAsNote(dossier.nextSteps)}
            disabled={dossier.nextSteps.length === 0}
          >
            Guardar próximos pasos como nota
          </button>
        </div>
      </div>
    </section>
  );
}

export function VerificationTasksPanel({
  workspace,
  readiness,
  onAddTask,
  onUpdateTaskStatus,
}: VerificationTasksPanelProps) {
  const tasks = workspace.verificationTasks ?? [];
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h3>Verificación</h3>
          <p>Acciones privadas para ordenar handoff interno. Publicación pública requiere curación manual.</p>
        </div>
        <span className={readiness?.ready ? styles.readyBadge : styles.notReadyBadge}>
          {readiness?.label ?? "No lista para handoff"}
        </span>
      </div>
      {readiness?.blockers.length ? (
        <div className={styles.readinessBox}>
          <strong>Estado para handoff</strong>
          <ul>
            {readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </div>
      ) : (
        <p className={styles.status}>Estado para handoff: Lista para handoff interno.</p>
      )}
      <div className={styles.taskList}>
        {tasks.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Sin tareas todavía</strong>
            <p>Guardá próximos pasos del dossier o agregá una acción manual.</p>
          </div>
        ) : tasks.map((task) => (
          <article key={task.id} className={styles.taskRow}>
            <div>
              <strong>{task.title}</strong>
              <p>{task.action}</p>
              <small>
                {task.source}
                {task.owner ? ` · Responsable: ${task.owner}` : " · Sin responsable"}
                {task.dueDate ? ` · Vence: ${task.dueDate}` : ""}
              </small>
            </div>
            <label className={styles.taskStatus}>
              <span>Estado</span>
              <select
                className={styles.select}
                value={task.status}
                onChange={(event) =>
                  onUpdateTaskStatus(task.id, event.target.value as InvestigationVerificationTaskStatus)
                }
              >
                <option value="pending">Pendiente</option>
                <option value="in_progress">En curso</option>
                <option value="done">Hecha</option>
                <option value="blocked">Bloqueada</option>
              </select>
            </label>
          </article>
        ))}
      </div>
      <details className={styles.inlineDisclosure}>
        <summary>Agregar tarea manual</summary>
        <form className={styles.taskForm} onSubmit={onAddTask}>
          <input className={styles.input} name="title" placeholder="Título breve" />
          <input className={styles.input} name="action" placeholder="Acción a verificar" required />
          <input className={styles.input} name="source" placeholder="Fuente o origen de la tarea" />
          <input className={styles.input} name="owner" placeholder="Responsable opcional" />
          <input className={styles.input} name="dueDate" type="date" aria-label="Fecha límite opcional" />
          <button className={styles.secondary} type="submit">Agregar tarea</button>
        </form>
      </details>
    </section>
  );
}

function summarizeDossierGap(gap: string): string {
  if (/sin geometr/i.test(gap)) return "Sin geometría";
  if (/contexto documental/i.test(gap)) return "Contexto separado";
  if (/pago|avance|recepci/i.test(gap)) return "Falta respaldo";
  if (/pr[oó]ximos pasos/i.test(gap)) return "Falta verificación";
  return "Revisar";
}

export function CaseSearchPanel({
  query,
  relationReason,
  relationNote,
  results,
  searchSuggestions,
  investigationQuestion,
  relationReasonOptions,
  onQueryChange,
  onSelectSearchSuggestion,
  onRelationReasonChange,
  onRelationNoteChange,
  onAddCase,
}: CaseSearchPanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h3>Agregar evidencia</h3>
          <p>
            {investigationQuestion
              ? `Buscá qué expediente ayuda a verificar: ${investigationQuestion}`
              : "Buscá por provincia, proveedor, organismo, CUIT, señal, fuente o expediente."}
          </p>
        </div>
      </div>
      <input
        className={styles.input}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar provincia, proveedor, CUIT, organismo, fuente o expediente"
      />
      <SearchSuggestionGroups
        suggestions={searchSuggestions}
        onSelectSuggestion={onSelectSearchSuggestion}
        compact
      />
      <div className={styles.relationControls}>
        <label className={styles.field}>
          <span>Motivo de relación</span>
          <select
            className={styles.select}
            value={relationReason}
            onChange={(event) => onRelationReasonChange(event.target.value as InvestigationCaseRelationReason)}
          >
            {relationReasonOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Nota de relación</span>
          <input
            className={styles.input}
            value={relationNote}
            onChange={(event) => onRelationNoteChange(event.target.value)}
            placeholder="Qué ayuda a verificar o qué queda pendiente"
          />
        </label>
      </div>
      <div className={styles.results}>
        {results.map((caseFile) => (
          <button
            key={caseFile.id}
            type="button"
            className={styles.result}
            onClick={() => onAddCase(caseFile.id, relationReason, relationNote)}
          >
            <span>{caseFile.title}</span>
            <small>{caseFile.id}</small>
            <small>{caseFile.receipt.sourceName} · {describeCaseEvidenceMarker(caseFile)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function describeCaseEvidenceMarker(caseFile: ExplorerCase): string {
  const record = caseFile as ExplorerCase & {
    bidderCount?: number | null;
    offerCount?: number | null;
    amount?: { value: number; currency: string } | null;
    officialBudget?: { value: number; currency: string } | null;
  };
  if (!caseFile.coordinates) return "brecha: sin geometría oficial";
  if (record.bidderCount === 1 || record.offerCount === 1) return "señal: competencia limitada";
  if (!record.amount || !Number.isFinite(record.amount.value) || record.amount.value <= 0) {
    return "brecha: sin monto comparable";
  }
  if (
    record.amount &&
    record.officialBudget &&
    record.amount.currency === record.officialBudget.currency &&
    record.amount.value > record.officialBudget.value * 1.05
  ) {
    return "señal: revisar presupuesto";
  }
  return "fuente oficial disponible";
}

export function SelectedCasesPanel({ selectedCases, workspace, onRemoveCase }: SelectedCasesPanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h3>Expedientes seleccionados</h3>
          <p>Cada fila debe explicar por qué entra en la carpeta y qué falta verificar.</p>
        </div>
      </div>
      <div className={styles.caseList}>
        {selectedCases.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Sin expedientes</strong>
            <p>Buscá un expediente y declará el motivo de relación antes de sumarlo.</p>
          </div>
        ) : selectedCases.map((caseFile) => {
          const relation = (workspace.caseRelations ?? []).find((item) => item.caseId === caseFile.id);
          return (
            <div key={caseFile.id} className={styles.caseRow}>
              <div>
                <strong>{caseFile.title}</strong>
                <div className={styles.caseMetaLine}>
                  <span>{caseFile.id}</span>
                  <span>{caseFile.receipt.sourceName}</span>
                  <span>{describeCaseEvidenceMarker(caseFile)}</span>
                </div>
                <p className={styles.caseRelationNote}>
                  {getInvestigationRelationReasonLabel(relation?.reason ?? "manual_hypothesis")}
                  {relation?.note ? ` · ${relation.note}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => onRemoveCase(caseFile.id)} aria-label="Quitar expediente">
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function InvestigationSummaryPanel({ aggregate }: { aggregate: InvestigationAggregate | null }) {
  if (!aggregate) return null;
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h3>Lectura agregada</h3>
          <p>Patrones útiles para orientar revisión, no para cerrar conclusiones.</p>
        </div>
      </div>
      <div className={styles.summaryGrid}>
        <SummaryList
          title="Motivos declarados"
          emptyText="Sin motivos cargados."
          items={aggregate.relationReasons.map((item) =>
            `${item.label}: ${item.count} expediente${item.count === 1 ? "" : "s"}`
          )}
        />
        <SummaryList
          title="Repeticiones"
          emptyText="Sin repeticiones detectadas."
          items={[
            ...aggregate.repeatedSuppliers.map((item) => `Proveedor: ${item.label} (${item.count})`),
            ...aggregate.repeatedAgencies.map((item) => `Organismo: ${item.label} (${item.count})`),
          ]}
        />
        <SummaryList
          title="Señales"
          emptyText="Sin señales."
          items={aggregate.signals.slice(0, 4).map((item) => `${item.label}: ${item.count}`)}
        />
        <SummaryList
          title="Línea temporal"
          emptyText="Sin años disponibles."
          items={aggregate.timeline.slice(0, 4).map((item) => `${item.year}: ${item.count}`)}
        />
      </div>
    </section>
  );
}

function SummaryList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className={styles.summaryList}>
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        <ul>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

function DossierList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className={styles.dossierList}>
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        <ul>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
