"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link as LinkIcon } from "lucide-react";

import type { InvestigationCasePack } from "@/lib/caseRepository";
import {
  addCaseToWorkspace,
  createInvestigationWorkspace,
  removeCaseFromWorkspace,
  type InvestigationAggregate,
  type InvestigationAnalysis,
  type InvestigationEntity,
  type InvestigationSourceLink,
  type InvestigationWorkspace,
} from "@/lib/data/investigationWorkspaces";
import { caseMatchesSearch } from "@/lib/data/searchSuggestions";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import { buildInvestigationZip } from "@/lib/client/investigationZip";
import {
  CaseSearchPanel,
  CreateWorkspaceForm,
  InvestigationAnalysisPanel,
  InvestigationsSidebar,
  SelectedCasesPanel,
  WorkspaceHeader,
} from "./InvestigationsChrome";
import styles from "./InvestigationsView.module.css";

interface Props {
  cases: ExplorerCase[];
  selectedCountry: "AR" | "PE" | "CL";
  onSwitchToMap: () => void;
  onSwitchToExplorer: () => void;
  onSwitchToAportes: () => void;
}

type AnalysisState = "idle" | "loading" | "success" | "error";

const storageKey = "faro-investigation-workspace-v1";

export default function InvestigationsView({
  cases,
  selectedCountry,
  onSwitchToMap,
  onSwitchToExplorer,
  onSwitchToAportes,
}: Props) {
  const [workspace, setWorkspace] = useState<InvestigationWorkspace | null>(null);
  const [query, setQuery] = useState("");
  const [noteText, setNoteText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [entityLabel, setEntityLabel] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [casePacks, setCasePacks] = useState<Record<string, InvestigationCasePack>>({});
  const [aggregate, setAggregate] = useState<InvestigationAggregate | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      setWorkspace(JSON.parse(stored) as InvestigationWorkspace);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    if (!workspace) return;
    window.localStorage.setItem(storageKey, JSON.stringify(workspace));
  }, [workspace]);

  useEffect(() => {
    if (!workspace || workspace.caseIds.length === 0) {
      setCasePacks({});
      return;
    }
    let cancelled = false;
    fetch(`/api/investigations/case-pack?ids=${workspace.caseIds.map(encodeURIComponent).join(",")}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("No se pudo cargar el paquete.")))
      .then((payload: { casePacks: InvestigationCasePack[] }) => {
        if (cancelled) return;
        setCasePacks(Object.fromEntries(payload.casePacks.map((pack) => [pack.caseId, pack])));
      })
      .catch((error: Error) => {
        if (!cancelled) setStatusText(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace?.caseIds.join("|")]);

  const selectedCases = useMemo(
    () => workspace?.caseIds.map((caseId) => cases.find((caseFile) => caseFile.id === caseId)).filter(Boolean) as ExplorerCase[] ?? [],
    [cases, workspace?.caseIds],
  );
  const results = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    return cases
      .filter((caseFile) => caseFile.countryCode === selectedCountry || !workspace?.countryCode)
      .filter((caseFile) => caseMatchesSearch(caseFile, trimmed))
      .slice(0, 8);
  }, [cases, query, selectedCountry, workspace?.countryCode]);
  const latestAnalysis = workspace?.analyses[workspace.analyses.length - 1] ?? null;

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setWorkspace(createInvestigationWorkspace({
      title: String(form.get("title") ?? ""),
      countryCode: selectedCountry,
      description: String(form.get("description") ?? ""),
      investigationQuestion: String(form.get("question") ?? ""),
      tags: String(form.get("tags") ?? "").split(","),
    }));
  }

  function handleAddCase(caseId: string) {
    if (!workspace) return;
    setWorkspace(addCaseToWorkspace(workspace, caseId));
    setQuery("");
  }

  function handleRemoveCase(caseId: string) {
    if (!workspace) return;
    setWorkspace(removeCaseFromWorkspace(workspace, caseId));
  }

  function handleAddNote() {
    if (!workspace || !noteText.trim()) return;
    setWorkspace({
      ...workspace,
      notes: [...workspace.notes, { id: `NOTE-${workspace.notes.length + 1}`, body: noteText.trim(), createdAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    });
    setNoteText("");
  }

  function handleAddSource() {
    if (!workspace || !sourceUrl.trim()) return;
    const source: InvestigationSourceLink = {
      id: `SRC-${workspace.sourceLinks.length + 1}`,
      url: sourceUrl.trim(),
      label: sourceUrl.trim(),
      note: "",
    };
    setWorkspace({ ...workspace, sourceLinks: [...workspace.sourceLinks, source], updatedAt: new Date().toISOString() });
    setSourceUrl("");
  }

  function handleAddEntity() {
    if (!workspace || !entityLabel.trim()) return;
    const entity: InvestigationEntity = {
      id: `ENT-${workspace.entities.length + 1}`,
      label: entityLabel.trim(),
      kind: "other",
      note: "",
    };
    setWorkspace({ ...workspace, entities: [...workspace.entities, entity], updatedAt: new Date().toISOString() });
    setEntityLabel("");
  }

  async function handleAnalyze() {
    if (!workspace) return;
    setAnalysisState("loading");
    setStatusText("Generando analisis de trabajo...");
    try {
      const response = await fetch("/api/investigations/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessCode, caseIds: workspace.caseIds, workspace }),
      });
      const payload = await response.json() as {
        analysis?: InvestigationAnalysis;
        aggregate?: InvestigationAggregate;
        error?: string;
        message?: string;
      };
      if (!response.ok || !payload.analysis) {
        throw new Error(payload.message ?? labelAnalysisError(payload.error));
      }
      setWorkspace({ ...workspace, analyses: [...workspace.analyses, payload.analysis], updatedAt: payload.analysis.createdAt });
      setAggregate(payload.aggregate ?? null);
      setAnalysisState("success");
      setStatusText("Analisis recibido. Revisalo antes de citarlo.");
    } catch (error) {
      setAnalysisState("error");
      setStatusText(error instanceof Error ? error.message : "No se pudo generar el analisis.");
    }
  }

  function handleExport() {
    if (!workspace) return;
    const zip = buildInvestigationZip({
      workspace,
      casePacks: workspace.caseIds.map((caseId) => casePacks[caseId]).filter(Boolean),
      analysisMarkdown: latestAnalysis?.markdown,
    });
    const url = URL.createObjectURL(new Blob([toArrayBuffer(zip.bytes)], { type: zip.mimeType }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = zip.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={styles.shell} aria-label="Investigaciones">
      <InvestigationsSidebar
        onSwitchToMap={onSwitchToMap}
        onSwitchToExplorer={onSwitchToExplorer}
        onSwitchToAportes={onSwitchToAportes}
      />

      <div className={styles.content}>
        {!workspace ? (
          <CreateWorkspaceForm onSubmit={handleCreate} />
        ) : (
          <div className={styles.workspace}>
            <WorkspaceHeader workspace={workspace} onExport={handleExport} />
            <CaseSearchPanel
              query={query}
              results={results}
              onQueryChange={setQuery}
              onAddCase={handleAddCase}
            />
            <SelectedCasesPanel selectedCases={selectedCases} onRemoveCase={handleRemoveCase} />

            <section className={styles.grid}>
              <div className={styles.panel}>
                <h3>Notas</h3>
                <textarea className={styles.textarea} value={noteText} onChange={(event) => setNoteText(event.target.value)} />
                <button className={styles.secondary} type="button" onClick={handleAddNote}>Agregar nota</button>
              </div>
              <div className={styles.panel}>
                <h3>Fuentes y entidades</h3>
                <input className={styles.input} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="Link publico u oficial" />
                <button className={styles.secondary} type="button" onClick={handleAddSource}><LinkIcon size={14} aria-hidden />Agregar fuente</button>
                <input className={styles.input} value={entityLabel} onChange={(event) => setEntityLabel(event.target.value)} placeholder="Proveedor, organismo, persona o expediente" />
                <button className={styles.secondary} type="button" onClick={handleAddEntity}>Agregar entidad</button>
              </div>
            </section>

            <InvestigationAnalysisPanel
              accessCode={accessCode}
              onAccessCodeChange={setAccessCode}
              onAnalyze={handleAnalyze}
              analysisLoading={analysisState === "loading"}
              caseCount={workspace.caseIds.length}
              statusText={statusText}
              isError={analysisState === "error"}
              aggregate={aggregate}
              analysisMarkdown={latestAnalysis?.markdown}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function labelAnalysisError(error?: string): string {
  if (error === "invalid_access_code") return "Codigo no valido para generar analisis.";
  if (error === "analysis_unavailable") return "Analisis no disponible en este entorno.";
  if (error === "too_many_case_ids") return "La carpeta tiene demasiados expedientes para este corte.";
  return "No se pudo generar el analisis.";
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
