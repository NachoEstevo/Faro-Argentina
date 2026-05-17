# Aportes V1 Design

Date: 2026-05-17
Status: approved direction, awaiting implementation plan

## Product Thesis

Faro should let readers help improve the investigation surface without turning
the product into a public community, complaint board, or accusation flow.

The right model is an intake lane: users can send a source, correction, problem,
or verifiable lead for Faro review. The contribution is not public, not a case,
and not evidence until the team validates it.

## Problem

Faro can currently show map cases, Explorer rows, expedientes, receipts, caveats,
and printable reports. It does not yet provide a structured way for a reader to
say:

- this source is missing;
- this data point looks wrong;
- this official record may deserve review;
- this page has a product or evidence issue.

Without a structured intake lane, useful feedback will arrive through scattered
messages and will lose provenance: who sent it, what source they cited, what was
claimed, and what still needs verification.

## Users

- Citizens and readers who found a public source and want to share it safely.
- Journalists or watchdogs who want to point Faro toward an official document.
- Domain experts who see a mistake, missing context, or outdated information.
- The Faro team, which needs reviewable, traceable, non-public submissions.

## Core Promise

A user can help improve Faro by sending a source, correction, or verifiable lead
through a neutral form. Faro stores it as a private pending contribution, then
the team decides whether it becomes a corrected field, added source, new lead, or
future expediente.

## Naming And Framing

The top-level mode should be:

- Tab label: `Aportes`
- Page title: `Ayudanos a mejorar Faro`
- Primary action: `Enviar aporte para revision`

Avoid `Comunidad`, `Denuncia`, `Publicar caso`, or similar language. The feature
is not a social surface. It is a review intake lane.

The default copy should say:

> Aporta una fuente, corregi un dato o sugeri una pista verificable. Todo lo
> enviado pasa por revision antes de usarse en Faro.

## MVP Scope

### Contribution Types

V1 supports four entry points:

- `suggest_lead`: suggest a verifiable lead;
- `add_source`: add a source to an existing case;
- `correct_data`: correct a visible data point;
- `report_issue`: report a product, source, or evidence problem.

Each type uses the same underlying form with small copy changes. Avoid separate
flows until the real use cases diverge.

### Form Fields

Required:

- contribution type;
- neutral title;
- country or jurisdiction;
- public source URL;
- explanation of what the source adds or what should be reviewed;
- confirmation that the submitted information comes from public sources;
- confirmation that the user understands the contribution is reviewed before
  publication or use.

Optional:

- related Faro case id or URL;
- official identifier such as expediente, contract, procedure, resolution, or
  sentence number;
- organization named in the source;
- supplier, person, or entity named in the source;
- amount and date if present in the source;
- what still needs verification;
- contact name;
- contact email.

The form should not request private personal data, document uploads, or sensitive
identity material in V1. Links are enough for the first version.

### Validation And Feedback

The form should guide completion without sounding bureaucratic:

- missing public source: "Necesitamos un link publico para poder revisar.";
- accusatory title or explanation: "Usa lenguaje neutral. Faro revisa fuentes,
  no publica acusaciones.";
- missing explanation: "Contanos que dato aporta o que deberiamos revisar.";
- missing review confirmations: "El aporte entra a revision antes de usarse.";

Validation is about review readiness, not approval. Passing validation does not
mean the contribution is true or publishable.

### Submission State

V1 stores or sends every contribution as private intake with this lifecycle:

- `submitted`: received and not reviewed;
- `needs_more_info`: useful but incomplete;
- `accepted_for_review`: ready for deeper verification;
- `approved`: validated enough to become a correction, source, lead, or case
  input;
- `rejected`: not usable, not verifiable, duplicate, unsafe, or out of scope.

Only Faro reviewers can change status. Public users do not see a public queue.

### Review Boundary

A contribution is never an `ExpedienteCaseFile`. It may later become:

- a correction to an existing case;
- a contextual citation;
- an additional official receipt;
- a new investigation lead;
- eventually a full expediente after normal data and evidence checks.

Promotion into public Faro data must remain manual until the team has a mature
moderation and provenance workflow.

## Architecture

### Data Model

Add a contribution model separate from case files:

- `UserContribution`
- `ContributionType`
- `ContributionReviewStatus`
- `ContributionSource`

The model should capture:

- stable id;
- contribution type;
- title;
- country or jurisdiction;
- source URL;
- source type if available;
- explanation;
- optional related case id;
- optional official identifier;
- optional named entities;
- optional amount/date;
- missing verification notes;
- submitter contact fields;
- consent/review confirmations;
- created timestamp;
- review status.

Do not add fields to `ExpedienteCaseFile` for pending user input.

### UI Placement

Add `Aportes` beside existing top-level modes:

`Mapa` | `Explorer` | `Aportes`

`Aportes` can be full-screen inside the current Faro shell. It should be quieter
than Explorer: one concise intro, one structured form, and a small review-state
explanation. No public feed, comments, likes, or contribution list.

### Submission Backend

V1 should support a private destination without forcing a large persistence
decision into this feature.

Preferred implementation path:

1. Define the data schema and UI in the repo.
2. Create a thin submission boundary that can later point to a real store.
3. For the first deployment, send contributions to a private controlled inbox
   or review queue.

If the project later adopts a database, the same model can back an internal
review screen. Until then, pending contributions should not be mixed into the
generated public dataset.

## Safety And Editorial Rules

- Faro does not accuse.
- The form must not ask users to label someone as corrupt, guilty, fraudulent,
  or criminal.
- News articles can provide context, but official or public-document sources are
  required for evidence-grade promotion.
- Private personal data is out of scope.
- Submissions stay private until reviewed.
- Rejected or unverified submissions are not shown in Explorer, reports, exports,
  or the map.

## Non-Goals

- No public community feed.
- No public comments.
- No automatic case creation.
- No anonymous accusation board.
- No file uploads in V1.
- No database migration unless separately approved.
- No admin dashboard in the first slice unless the submission destination
  requires it.
- No changes to map geometry rules or evidence receipt requirements.

## Acceptance Criteria

- The main experience includes an `Aportes` mode beside `Mapa` and `Explorer`.
- The page title and copy frame the feature as "Ayudanos a mejorar Faro".
- A user can choose one of the four contribution types and submit a structured
  contribution.
- Required validation blocks submissions without a public source URL,
  explanation, or review confirmations.
- Copy remains neutral and does not encourage accusations.
- The submitted payload uses a contribution model separate from
  `ExpedienteCaseFile`.
- No submitted contribution appears in public case data, Explorer rows, map
  markers, reports, or exports automatically.
- Tests cover model validation, safe copy, mode routing, and successful form
  submission behavior.

## Open Implementation Decision

The only decision left for the implementation plan is the first private
destination:

- private API route plus environment-configured inbox;
- repository-local review file for development only;
- external controlled form destination as a temporary operational bridge.

The product requirement is fixed either way: intake is private and reviewed
before any public use.
