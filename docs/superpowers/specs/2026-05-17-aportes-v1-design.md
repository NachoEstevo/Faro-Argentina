# Aportes V1 Design

Date: 2026-05-17
Status: approved direction, awaiting implementation plan

## Product Thesis

Faro should let readers help improve the investigation surface without turning
the product into a public community, complaint board, or accusation flow.

The right model is an intake lane: users can send a source, correction, problem,
photo, or verifiable lead for Faro review. The contribution is not public, not a
case, and not evidence until the team validates it.

## Problem

Faro can currently show map cases, Explorer rows, expedientes, receipts, caveats,
and printable reports. It does not yet provide a structured way for a reader to
say:

- this source is missing;
- this data point looks wrong;
- this official record may deserve review;
- this nearby place, public work, sign, or document can be photographed;
- this page has a product or evidence issue.

Without a structured intake lane, useful feedback will arrive through scattered
messages and will lose provenance: who sent it, what source they cited, what was
claimed, and what still needs verification.

## Users

- Citizens and readers who found a public source and want to share it safely.
- People near a visible work, office, sign, document, or location who want to
  send photos for review.
- Journalists or watchdogs who want to point Faro toward an official document.
- Domain experts who see a mistake, missing context, or outdated information.
- The Faro team, which needs reviewable, traceable, non-public submissions.

## Core Promise

A user can help improve Faro by sending a source, correction, photo, or
verifiable lead through a neutral form. Faro stores it as a private pending
contribution, then the team decides whether it becomes a corrected field, added
source, contextual material, new lead, or future expediente.

## Naming And Framing

The top-level mode should be:

- Tab label: `Aportes`
- Page title: `Ayudanos a mejorar Faro`
- Primary action: `Enviar aporte para revision`

Avoid `Comunidad`, `Denuncia`, `Publicar caso`, or similar language. The feature
is not a social surface. It is a review intake lane.

The default copy should say:

> Aporta una fuente, subi una foto, corregi un dato o sugeri una pista
> verificable. Todo lo enviado pasa por revision antes de usarse en Faro.

## MVP Scope

### Contribution Types

V1 supports five entry points:

- `suggest_lead`: suggest a verifiable lead;
- `add_source`: add a source to an existing case;
- `correct_data`: correct a visible data point;
- `add_photo`: send user-taken photos for review;
- `report_issue`: report a product, source, or evidence problem.

Each type uses the same underlying form with small copy changes. Avoid separate
flows until the real use cases diverge.

### Form Fields

Required:

- contribution type;
- neutral title;
- country or jurisdiction;
- at least one review anchor: public source URL, related Faro case, or attached
  photo with location/context notes;
- explanation of what the source adds or what should be reviewed;
- confirmation that the submitted information comes from public sources or
  user-taken material the submitter has permission to share with Faro;
- confirmation that the user understands the contribution is reviewed before
  publication or use.

Optional:

- related Faro case id or URL;
- official identifier such as expediente, contract, procedure, resolution, or
  sentence number;
- organization named in the source;
- supplier, person, or entity named in the source;
- amount and date if present in the source;
- approximate location for user-taken photos;
- date when a user-taken photo was captured;
- what still needs verification;
- contact name;
- contact email.

The form should not request private personal data or sensitive identity material
in V1. Photo uploads are allowed as private review material, but they do not
become public evidence automatically.

### Attachments

V1 allows private attachments for photos and simple supporting files:

- accepted image types: JPG, PNG, WebP;
- optional supporting file type: PDF, only if the implementation can validate
  size and MIME type safely;
- maximum 5 files per contribution;
- maximum 10 MB per file;
- attachment notes are optional but encouraged.

Photos are user-contributed context. They can help the team understand a place,
sign, work state, document, or visible condition, but they are not official
evidence and should never be shown publicly without review and sanitization.

### Validation And Feedback

The form should guide completion without sounding bureaucratic:

- missing review anchor: "Necesitamos un link publico, un caso relacionado o
  una foto con contexto para poder revisar.";
- accusatory title or explanation: "Usa lenguaje neutral. Faro revisa fuentes,
  no publica acusaciones.";
- missing explanation: "Contanos que dato aporta o que deberiamos revisar.";
- unsafe attachment: "Solo aceptamos imagenes validas para revision privada.";
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

User photos can become contextual material only after review. They do not become
official receipts and must not be used to infer wrongdoing, coordinates, or case
facts without separate verification.

## Architecture

### Data Model

Add a contribution model separate from case files:

- `UserContribution`
- `ContributionType`
- `ContributionReviewStatus`
- `ContributionSource`
- `UserContributionAttachment`

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
- optional approximate photo location;
- optional photo captured date;
- attachment references;
- missing verification notes;
- submitter contact fields;
- consent/review confirmations;
- created timestamp;
- review status.

Do not add fields to `ExpedienteCaseFile` for pending user input.

Attachment records should capture:

- stable attachment id;
- owning contribution id;
- original filename;
- stored object key;
- MIME type;
- file size;
- upload timestamp;
- optional user note;
- private review status.

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
3. Store uploaded files privately and keep only private object references in the
   contribution payload.
4. For the first deployment, send contributions to a private controlled inbox
   or review queue.

If the project later adopts a database, the same model can back an internal
review screen. Until then, pending contributions should not be mixed into the
generated public dataset.

### Private File Storage

Cloudflare R2 is the recommended storage target for V1 attachments because it
keeps the feature small while avoiding public file exposure.

Recommended bucket and environment variables:

- bucket name: `faro`;
- endpoint env: `STORAGE_ENDPOINT`;
- bucket env: `STORAGE_BUCKET`;
- access key env: `STORAGE_ACCESS_KEY`;
- secret key env: `STORAGE_SECRET_KEY`;
- access: private;
- object key pattern:
  `submissions/{submissionId}/{attachmentId}.{extension}`;
- no public bucket URLs;
- reviewer access through signed URLs or a private operational inbox.

The upload path must validate file type and size before storing. The review
payload should include object keys and metadata, not public links. If photos are
ever approved for public use, generate sanitized public derivatives separately
instead of exposing the original upload.

## Safety And Editorial Rules

- Faro does not accuse.
- The form must not ask users to label someone as corrupt, guilty, fraudulent,
  or criminal.
- News articles can provide context, but official or public-document sources are
  required for evidence-grade promotion.
- Private personal data is out of scope.
- User photos are private contextual material until reviewed.
- Photo metadata should not be trusted as proof of location or date.
- Public use of photos requires a sanitized derivative and explicit reviewer
  approval.
- Submissions stay private until reviewed.
- Rejected or unverified submissions are not shown in Explorer, reports, exports,
  or the map.

## Non-Goals

- No public community feed.
- No public comments.
- No automatic case creation.
- No anonymous accusation board.
- No public file gallery.
- No automatic publication of uploaded photos.
- No database migration unless separately approved.
- No admin dashboard in the first slice unless the submission destination
  requires it.
- No changes to map geometry rules or evidence receipt requirements.

## Acceptance Criteria

- The main experience includes an `Aportes` mode beside `Mapa` and `Explorer`.
- The page title and copy frame the feature as "Ayudanos a mejorar Faro".
- A user can choose one of the five contribution types and submit a structured
  contribution.
- Required validation blocks submissions without a review anchor, explanation,
  or review confirmations.
- Users can attach private photos to a contribution within type and size limits.
- Copy remains neutral and does not encourage accusations.
- The submitted payload uses a contribution model separate from
  `ExpedienteCaseFile`.
- No submitted contribution appears in public case data, Explorer rows, map
  markers, reports, or exports automatically.
- No uploaded photo appears publicly without explicit review and sanitized
  publication work.
- Tests cover model validation, attachment validation, safe copy, mode routing,
  and successful form submission behavior.

## Open Implementation Decision

The only decision left for the implementation plan is the first private
destination:

- private API route plus environment-configured inbox and private R2 bucket;
- repository-local review file for development only, with local attachments kept
  out of git;
- external controlled form destination as a temporary operational bridge, only if
  it supports private attachment handling.

The product requirement is fixed either way: intake is private and reviewed
before any public use.
