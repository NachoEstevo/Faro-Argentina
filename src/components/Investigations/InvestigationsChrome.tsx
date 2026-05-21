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
import {
  getInvestigationRelationReasonLabel,
  type InvestigationAggregate,
  type InvestigationCaseRelationReason,
  type InvestigationWorkspace,
} from "@/lib/data/investigationWorkspaces";
import { parseInvestigationAnalysisBlocks } from "@/lib/data/investigationAnalysisText";
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
