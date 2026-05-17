"use client";

import type { FormEvent } from "react";
import {
  Download,
  FileSearch,
  FolderOpen,
  Map as MapIcon,
  MessageSquarePlus,
  Plus,
  Send,
  Trash2,
} from "lucide-react";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { InvestigationAggregate, InvestigationWorkspace } from "@/lib/data/investigationWorkspaces";
import styles from "./InvestigationsView.module.css";

interface SidebarProps {
  onSwitchToMap: () => void;
  onSwitchToExplorer: () => void;
  onSwitchToAportes: () => void;
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
  onExport: () => void;
}

interface CaseSearchPanelProps {
  query: string;
  results: ExplorerCase[];
  onQueryChange: (value: string) => void;
  onAddCase: (caseId: string) => void;
}

interface SelectedCasesPanelProps {
  selectedCases: ExplorerCase[];
  onRemoveCase: (caseId: string) => void;
}

export function InvestigationsSidebar({
  onSwitchToMap,
  onSwitchToExplorer,
  onSwitchToAportes,
}: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.modeSwitch} role="group" aria-label="Modo de exploración">
        <button type="button" className={styles.modeButton} onClick={onSwitchToMap}>
          <MapIcon size={13} aria-hidden />
          Mapa
        </button>
        <button type="button" className={styles.modeButton} onClick={onSwitchToExplorer}>
          <FileSearch size={13} aria-hidden />
          Explorer
        </button>
        <button type="button" className={styles.modeButton} onClick={onSwitchToAportes}>
          <MessageSquarePlus size={13} aria-hidden />
          Aportes
        </button>
        <button type="button" className={`${styles.modeButton} ${styles.activeMode}`} aria-pressed="true">
          <FolderOpen size={13} aria-hidden />
          Investigaciones
        </button>
      </div>
      <p className={styles.eyebrow}>Carpeta privada</p>
      <h1 className={styles.title}>Carpeta de investigación</h1>
      <p className={styles.intro}>
        Armá una carpeta local con expedientes, fuentes, notas y entidades. Nada se publica automáticamente.
      </p>
      <div className={styles.rules}>
        <span>El trabajo se guarda en este navegador.</span>
        <span>Minimax solo ordena el paquete que vos armaste.</span>
      </div>
    </aside>
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
      {analysisMarkdown && <pre className={styles.analysis}>{analysisMarkdown}</pre>}
    </section>
  );
}

export function WorkspaceHeader({ workspace, onExport }: WorkspaceHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Investigaciones</p>
        <h2>{workspace.title}</h2>
        <p>{workspace.description || "Carpeta local de trabajo."}</p>
      </div>
      <button className={styles.primary} type="button" onClick={onExport}>
        <Download size={15} aria-hidden />
        Exportar carpeta ZIP
      </button>
    </header>
  );
}

export function CaseSearchPanel({ query, results, onQueryChange, onAddCase }: CaseSearchPanelProps) {
  return (
    <section className={styles.panel}>
      <h3>Agregar expedientes Faro</h3>
      <input
        className={styles.input}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar por proveedor, organismo, señal o id"
      />
      <div className={styles.results}>
        {results.map((caseFile) => (
          <button key={caseFile.id} type="button" className={styles.result} onClick={() => onAddCase(caseFile.id)}>
            <span>{caseFile.title}</span>
            <small>{caseFile.id}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export function SelectedCasesPanel({ selectedCases, onRemoveCase }: SelectedCasesPanelProps) {
  return (
    <section className={styles.panel}>
      <h3>Expedientes seleccionados</h3>
      <div className={styles.caseList}>
        {selectedCases.length === 0 ? (
          <p className={styles.empty}>Todavía no agregaste expedientes.</p>
        ) : selectedCases.map((caseFile) => (
          <div key={caseFile.id} className={styles.caseRow}>
            <div>
              <strong>{caseFile.title}</strong>
              <small>{caseFile.id}</small>
            </div>
            <button type="button" onClick={() => onRemoveCase(caseFile.id)} aria-label="Quitar expediente">
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
