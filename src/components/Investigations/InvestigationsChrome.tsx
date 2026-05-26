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

import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { InvestigationDossier } from "@/lib/data/investigationDossiers";
import {
  getInvestigationRelationReasonLabel,
  type InvestigationAggregate,
  type InvestigationCaseRelationReason,
  type InvestigationWorkspace,
} from "@/lib/data/investigationWorkspaces";
import { parseInvestigationAnalysisBlocks } from "@/lib/data/investigationAnalysisText";
import PlatformModeNav, { type PlatformMode } from "../PlatformModeNav";
import styles from "./InvestigationsView.module.css";

interface SidebarProps {
  onSwitchToMap: () => void;
  onSwitchToExplorer: () => void;
  onSwitchToAportes: () => void;
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
  onSaveNextSteps: (steps: string[]) => void;
}

interface CaseSearchPanelProps {
  query: string;
  relationReason: InvestigationCaseRelationReason;
  relationNote: string;
  results: ExplorerCase[];
  relationReasonOptions: Array<{ value: InvestigationCaseRelationReason; label: string }>;
  onQueryChange: (value: string) => void;
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
  { id: "resumen", label: "Resumen" },
  { id: "expedientes", label: "Expedientes" },
  { id: "notas", label: "Notas" },
  { id: "analisis", label: "Análisis" },
  { id: "exportar", label: "Exportar" },
];

export function InvestigationsSidebar({
  onSwitchToMap,
  onSwitchToExplorer,
  onSwitchToAportes,
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
  function switchPlatformMode(mode: PlatformMode) {
    if (mode === "map") onSwitchToMap();
    else if (mode === "explorer") onSwitchToExplorer();
    else if (mode === "aportes") onSwitchToAportes();
  }

  return (
    <aside className={styles.sidebar}>
      <PlatformModeNav
        activeMode="investigations"
        onModeChange={switchPlatformMode}
        variant="sidebar"
      />
      <p className={styles.eyebrow}>Carpeta privada</p>
      <h1 className={styles.title}>Carpeta de investigación</h1>
      <p className={styles.intro}>
        Armá una carpeta local con expedientes, fuentes, notas y entidades. Nada se publica automáticamente.
      </p>
      <div className={styles.rules}>
        <span>El trabajo se guarda en este navegador.</span>
        <span>Minimax solo ordena el paquete que vos armaste.</span>
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
    <section className={styles.syncPanel} aria-label="Cuenta privada">
      <div className={styles.syncHeader}>
        <span>
          <UserRound size={13} aria-hidden />
          Cuenta privada
        </span>
        <small>{workspaceCount} carpeta{workspaceCount === 1 ? "" : "s"}</small>
      </div>
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
    </section>
  );
}

export function CreateWorkspaceForm({ onSubmit }: CreateFormProps) {
  return (
    <form className={styles.form} onSubmit={onSubmit}>
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
      <h3>Análisis con Minimax</h3>
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
        <p className={styles.eyebrow}>Carpetas</p>
        <h2>{workspace.title}</h2>
        <p>{workspace.description || "Carpeta local de trabajo."}</p>
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
  onExport,
}: {
  workspace: InvestigationWorkspace;
  aggregate: InvestigationAggregate | null;
  onExport: () => void;
}) {
  return (
    <section className={styles.panel}>
      <h3>Exportar carpeta</h3>
      <p className={styles.empty}>
        Descargá un ZIP con la carpeta local, expedientes, fuentes, notas y el último análisis disponible.
      </p>
      <div className={styles.metrics}>
        <span>{workspace.caseIds.length} expedientes</span>
        <span>{workspace.notes.length} notas</span>
        <span>{workspace.sourceLinks.length} fuentes manuales</span>
        {aggregate && <span>{aggregate.sourceIds.length} fuentes en expedientes</span>}
      </div>
      <button className={styles.primary} type="button" onClick={onExport}>
        <Download size={15} aria-hidden />
        Exportar carpeta ZIP
      </button>
    </section>
  );
}

export function DossierBuilderPanel({ dossier, caseCount, onSaveNextSteps }: DossierBuilderPanelProps) {
  if (!dossier) {
    return (
      <section className={styles.panel}>
        <h3>Dossier de trabajo</h3>
        <p className={styles.empty}>
          {caseCount > 0
            ? "Cargando matriz de evidencia con los expedientes guardados."
            : "Agregá expedientes para construir una matriz de evidencia."}
        </p>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h3>Dossier de trabajo</h3>
          <p>Ordena evidencia oficial, contexto del usuario, brechas y próximos pasos. No publica ni concluye por sí solo.</p>
        </div>
      </div>
      <div className={styles.dossierGrid}>
        <div className={styles.dossierMatrix}>
          <h4>Matriz de evidencia</h4>
          {dossier.matrix.length === 0 ? (
            <p className={styles.empty}>Sin expedientes seleccionados.</p>
          ) : (
            dossier.matrix.slice(0, 5).map((row) => (
              <div key={row.caseId} className={styles.matrixRow}>
                <div className={styles.matrixMeta}>
                  <strong>{row.caseId}</strong>
                  <em>{row.title}</em>
                  <span>{row.relation}</span>
                </div>
                <div className={styles.matrixBody}>
                  <span>
                    <b>Oficial</b>
                    {row.officialEvidence}
                    <a className={styles.matrixAction} href={row.officialSourceUrl} target="_blank" rel="noreferrer">
                      Abrir fuente oficial
                    </a>
                  </span>
                  <span><b>Contexto del usuario</b>{row.userContext}</span>
                  <span><b>Caveat</b>{row.caveat}</span>
                  <span><b>Brecha</b>{row.gap}</span>
                  <span><b>Próximo paso</b>{row.nextStep}</span>
                </div>
              </div>
            ))
          )}
          {dossier.matrix.length > 5 && (
            <p className={styles.empty}>Mostrando 5 de {dossier.matrix.length} expedientes. El ZIP exporta la matriz completa.</p>
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
            onClick={() => onSaveNextSteps(dossier.nextSteps)}
            disabled={dossier.nextSteps.length === 0}
          >
            Guardar próximos pasos como nota
          </button>
        </div>
      </div>
    </section>
  );
}

export function CaseSearchPanel({
  query,
  relationReason,
  relationNote,
  results,
  relationReasonOptions,
  onQueryChange,
  onRelationReasonChange,
  onRelationNoteChange,
  onAddCase,
}: CaseSearchPanelProps) {
  return (
    <section className={styles.panel}>
      <h3>Agregar expedientes Faro</h3>
      <input
        className={styles.input}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar por proveedor, organismo, señal o id"
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
            placeholder="Por qué entra en esta carpeta"
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
          </button>
        ))}
      </div>
    </section>
  );
}

export function SelectedCasesPanel({ selectedCases, workspace, onRemoveCase }: SelectedCasesPanelProps) {
  return (
    <section className={styles.panel}>
      <h3>Expedientes seleccionados</h3>
      <div className={styles.caseList}>
        {selectedCases.length === 0 ? (
          <p className={styles.empty}>Todavía no agregaste expedientes.</p>
        ) : selectedCases.map((caseFile) => {
          const relation = (workspace.caseRelations ?? []).find((item) => item.caseId === caseFile.id);
          return (
            <div key={caseFile.id} className={styles.caseRow}>
              <div>
                <strong>{caseFile.title}</strong>
                <small>{caseFile.id}</small>
                <small>
                  {getInvestigationRelationReasonLabel(relation?.reason ?? "manual_hypothesis")}
                  {relation?.note ? ` · ${relation.note}` : ""}
                </small>
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
      <h3>Resumen de carpeta</h3>
      <div className={styles.metrics}>
        <span>{aggregate.caseCount} expedientes</span>
        <span>{aggregate.sourceIds.length} fuentes</span>
        <span>{aggregate.geometryGaps.count} sin geometría oficial</span>
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
