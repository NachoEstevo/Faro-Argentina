# Investigation Workspaces V1 Design

Date: 2026-05-17
Status: proposed for user review before implementation plan

## Product Thesis

Faro should give journalists and investigators a private workspace for building
an investigation from multiple Faro expedientes, sources, notes and files.

The workspace is not a public case creator. It is a local-first research folder:
the user collects material, Faro organizes the evidence, and Minimax helps draft
a careful working analysis that stays tied to receipts and caveats.

## Problem

Faro already has Explorer, expedientes, receipts, contextual citations,
printable case reports and evidence exports. A reporter can inspect one case,
but multi-case work is still manual.

The Causa Vialidad example shows why this matters. A single judicial context can
refer to many works or licitaciones. Faro should help a reporter assemble those
items, compare them, and see what is documentable without pretending that every
relationship is already proven by the checked-in data.

## Users

- Journalists building a source-backed investigation.
- Watchdogs comparing suppliers, agencies, places and repeated patterns.
- Faro reviewers turning private aportes into structured research.
- Advanced readers who want to save a local evidence bundle.

## Naming And Framing

Top-level mode:

- Tab label: `Investigaciones`
- Page title: `Carpeta de investigacion`
- Primary empty-state action: `Crear carpeta`
- Analysis action: `Generar analisis de trabajo`
- Export action: `Exportar carpeta ZIP`

Avoid:

- `Crear caso publico`
- `Denuncia`
- `Caso probado`
- `Score de corrupcion`

The copy should say that the workspace is private, local, and not published by
Faro.

## V1 Scope

### Workspace Creation

The user can create a local workspace with:

- title;
- country or region;
- short neutral description;
- optional investigation question;
- optional tags.

The workspace is saved in the browser. No account is required.

### Workspace Items

V1 supports these item types:

- `faro_case`: an existing Faro expediente selected by case id;
- `source_link`: a public or official URL with a note;
- `manual_note`: a plain text note written by the user;
- `named_entity`: a supplier, agency, person, case number, work id or contract
  id mentioned by the user;
- `local_file`: an optional local file kept for export and analysis metadata.

V1 should start with Faro cases, links, notes and entities. Local files can be
included if they can be stored and exported without adding a risky persistence
model.

### Adding Faro Cases

The user should be able to add cases from:

- the Investigation tab by searching case id, title, supplier, agency or signal;
- Explorer rows with an `Agregar a carpeta` action when a workspace exists.

Adding a case stores the case id and a compact snapshot of the current
expediente/evidence pack. The snapshot is included in exports so the workspace
remains understandable outside the live app.

### Local-First Storage

V1 does not add login or server persistence.

Use browser storage for active work:

- metadata and selected case ids in `localStorage`;
- larger file blobs in IndexedDB only if needed;
- no Minimax API key in the browser.

The user owns the portable copy by exporting a ZIP. If browser storage is
cleared, the exported ZIP is the durable backup.

### Access Code

Minimax analysis is gated by a simple beta access code. The value must live only
in environment variables, not in tracked source files.

Implementation should validate this server-side with:

```text
INVESTIGATIONS_ACCESS_CODE
```

The frontend asks for the code only when the user tries to generate analysis.
Creating, editing, importing and exporting a workspace should not require the
code.

### Minimax Analysis

The backend exposes a thin API, for example:

```text
POST /api/investigations/analyze
```

The request includes:

- access code;
- workspace metadata;
- selected case evidence packs;
- user notes;
- source links;
- named entities;
- deterministic cross-case aggregates.

The backend uses `MINIMAX_API_KEY` and never sends it to the browser.

The prompt must instruct Minimax to:

- use only the provided workspace package;
- not browse or invent sources;
- separate official evidence, journalism context, user notes and gaps;
- avoid accusation language;
- return a structured analysis that can be rendered in the UI and exported.

### Deterministic Cross-Case Analysis

Before calling Minimax, Faro should compute a deterministic summary:

- repeated suppliers and supplier documents;
- repeated agencies or contracting units;
- recurring source ids;
- amounts by currency and case type;
- year/date timeline;
- shared signals;
- related receipt counts;
- cases without official geometry;
- user-mentioned entities that match selected cases;
- evidence gaps.

Minimax should explain and summarize this package. It should not be the source of
truth for the computed facts.

### Analysis Output

The analysis result should include:

- plain-language summary;
- what is supported by official receipts;
- repeated entities and why they matter;
- timeline;
- grouped amounts;
- strongest leads to review next;
- explicit caveats;
- missing documents or joins;
- questions for the reporter to answer;
- suggested next steps.

Every factual section should reference case ids, source ids, receipt ids or user
notes. If support is missing, the output must say so.

### Export ZIP

V1 exports a standard `.zip`, not `.rar`.

Reason: ZIP is native to every operating system and easier to generate and
inspect. RAR would add unnecessary operational friction.

Suggested ZIP structure:

```text
faro-investigacion-<slug>.zip
  workspace.json
  README.txt
  notes.md
  analysis.md
  cases/
    <case-id>.expediente.json
    <case-id>.evidence.json
  sources/
    links.json
  uploads/
    <file-name>
```

The ZIP should be enough for a non-technical user to understand what they saved.
`README.txt` should explain that this is a working research folder, not a public
Faro finding.

### PDF

V1 can generate a printable HTML report and let the browser save it as PDF. This
matches the current printable case report pattern and avoids adding a PDF
library before the workflow proves itself.

The ZIP can include `analysis.md` and `workspace.json`; the PDF is a convenience
export from the UI.

## Data Model

```ts
interface InvestigationWorkspace {
  id: string;
  version: "faro_investigation_workspace_v1";
  title: string;
  countryCode: string | null;
  description: string;
  investigationQuestion: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  caseIds: string[];
  sourceLinks: InvestigationSourceLink[];
  notes: InvestigationNote[];
  entities: InvestigationEntity[];
  files: InvestigationFile[];
  analyses: InvestigationAnalysis[];
}
```

Keep the workspace separate from `ExpedienteCaseFile`. A workspace can contain
many expedientes, but it is not itself a public expediente.

## API Boundaries

Possible endpoints:

- `GET /api/investigations/case-pack?ids=...`
  - returns selected expedientes and evidence packs for local workspace export;
- `POST /api/investigations/analyze`
  - validates access code and calls Minimax;
- `POST /api/investigations/export`
  - optional server-side ZIP builder if client-side ZIP becomes too heavy.

Prefer keeping route handlers thin. Cross-case analysis belongs in
`src/lib/data` or a focused `src/lib/investigations` module.

## Security And Abuse Controls

- Do not expose `MINIMAX_API_KEY` to the browser.
- Validate `INVESTIGATIONS_ACCESS_CODE` server-side.
- Limit selected cases per analysis in V1, for example 40 cases.
- Limit notes/source text length sent to Minimax.
- Reject unsupported or oversized files from analysis payloads.
- Never send raw file contents to Minimax in V1 unless explicitly implemented
  and size-limited.
- Log no secrets.

The access code is a beta gate, not strong authentication. If this becomes a
public high-traffic feature, add real auth.

## Auth Decision

Do not add Clerk, Auth0 or another login provider in V1.

Reason: the product value can be tested with local-first workspaces and an access
code for Minimax. Adding accounts now would increase implementation and support
cost before the workflow is validated.

If V2 needs accounts, Clerk is the simplest Vercel-native option because it can
be provisioned from the Vercel Marketplace and provides Next.js middleware,
sign-in pages and server-side user checks.

## Error Handling

- Missing access code: ask for the beta code before analysis.
- Wrong access code: show `Codigo no valido para generar analisis.`
- Missing `MINIMAX_API_KEY`: show `Analisis no disponible en este entorno.`
- Too many cases: ask the user to reduce the folder size.
- Minimax failure: preserve the workspace and show a retry option.
- Export failure: keep the workspace editable and show which file failed.

## Testing

Add focused tests for:

- workspace validation;
- adding/removing case ids without duplicates;
- deterministic aggregate builder;
- analysis request payload redaction and limits;
- access-code validation;
- Minimax response parsing with a fake response;
- ZIP manifest shape, if ZIP builder is implemented in repo code;
- UI smoke tests for create workspace, add case, analyze-gated state and export.

## Non-Goals For V1

- Public user profiles.
- Public workspace sharing.
- Publishing a workspace as a Faro case.
- Multi-user collaboration.
- Automatic promotion into official Faro data.
- Accusation or wrongdoing scoring.
- Browsing the internet from Minimax.
- Full PDF generation on the server.

## Implementation Decisions

- Generate ZIP client-side with a small internal uncompressed ZIP writer. This
  keeps private workspace material in the browser and avoids adding a dependency
  before the workflow proves itself.
- Persist local file blobs in IndexedDB only after the core case/link/note flow
  works. The first implementation slice can export workspace metadata and Faro
  case packs without local file blobs.
- Ship `Agregar a carpeta` inside Explorer after the Investigation tab can
  create a workspace and add cases by search. That keeps the first slice simple.

## Recommended First Slice

1. Build the pure workspace model and deterministic aggregate builder.
2. Add an `Investigaciones` tab with local create/edit/add-case flow.
3. Add access-code-gated Minimax analysis endpoint.
4. Render the analysis result in plain language with caveats.
5. Export workspace ZIP with JSON, notes, analysis and selected case packs.
