<div align="center">

# Design-System-Admin-Hub-Tools

[KR](README.md) · **EN** · [JP](README.ja.md) · [CN](README.zh.md)

An admin platform covering the full surface of admin screens for Korean-market **B2C** / **B2C + Company** services<br />
From a single source of Contract · Token — **100% four-way sync across React · Storybook · Figma**

</div>

---

## Background

Korean B2C services ship almost the same list of admin screens regardless of the company. Members and permissions, products and categories, coupons and reward points, reviews, exchanges and returns, bookings and applications, support tickets, marketing sends, notices · FAQ · terms. The moment a corporate site is attached (**B2C + Company**), company information · history · certifications · ESG · partners · portfolio · case studies come along with it, plus sales screens like accounts, contracts, quotes, and projects.

The problem is that these screens get built from scratch on every project. The same list table, the same filter bar, the same delete confirmation dialog — each time slightly differently. An admin built that way looks less and less like itself as the screen count grows.

This repository is the result of building that repetition **once**, properly, and freezing it. It implements the **full surface** of the management screens that Korean-market B2C / B2C + Company services actually need, on top of a single design system, and enforces that consistency **through a pipeline and gates** rather than human review.

### What it covers

| Domain | Admin screens |
| --- | --- |
| **Dashboard** | Metric summary · To-dos · Trend charts |
| **Members · Operations** | Members / Member detail · Administrators · Permissions (roles) · Customer settings · Login history |
| **Products** (B2C) | Products · Categories · Coupons · Reviews · Exchanges/Returns · Shipping policy · Reward point policy |
| **Bookings · Applications** (B2C) | Bookings · Application forms · Consultation bookings · Schedule calendar |
| **Customer center** (B2C) | Tickets · Inquiry types · Reply templates · FAQ curation · Resource library |
| **Marketing** (B2C) | Events · Promotions · Newsletter · SMS · Email · Send templates |
| **Content** (shared) | Notices · FAQ · Popups · Banners · Terms · Privacy policy (with version history) |
| **Company** (Company) | Company information · CEO greeting · Directions · Partners · Clients · History · Certifications · ESG |
| **Portfolio** (Company) | Portfolio · Categories · Case studies |
| **Sales** (Company) | Accounts · Contracts · Quotes · Inquiries · Projects · Consultation history |

List/detail/create/edit ship as one set, and every component that fills those screens comes from exactly one place, `@tds/ui` — 12 atoms · 21 molecules · 5 organisms, **38 contracts**.

---

## Quick start

> **One command:** `pnpm i && pnpm dev` → **http://localhost:5173** (Admin app, every route live)

> Requirements: **Node ≥ 20** · **pnpm 9.15**

```bash
pnpm install && pnpm dev  # ← the top-level one command. Serves the Admin app on :5173 with every route

# In more detail:
pnpm dev                  # Admin app (:5173) — all page routes
pnpm dev:all              # Admin (:5173) + Storybook (:6006) together
pnpm codegen              # contracts/tokens → generate types · argTypes · figma.json · CSS
pnpm gate:precheck        # contracts + naming + four-way agreement + coverage + clean code (required before requesting review)
pnpm sb                   # Storybook (:6006)
```

> Orchestration is handled by **Turborepo** — it runs `dev`·`build`·`lint`·`test`·`typecheck` over the
> workspace dependency graph with a local cache. Adding a new app/package is picked up automatically,
> with no root-script changes.

---

## Specifications

Screens are frozen as documents before they are built. `specs/` holds **196** of them — three kinds paired along a screen number, laid out per screen under `specs/<section>/<subsection>/` (e.g. `specs/users/members/`).

| Document | Count | What it freezes |
| --- | --- | --- |
| **FS** feature specs | **70** (`FS-001`~`FS-070`) | Every screen element is numbered exhaustively (`FS-001-EL-008`). §4 fills element × **7 exception axes** (empty · loading · failure · validation · unauthorized · contention · bulk) **with no blanks** |
| **BE** backend feature specs | **70** (`BE-001`~`BE-070`) | Endpoints · shared error envelope · auth/permission model. §5's exception matrix covers **9 axes** (400 validation · 401 auth · 403 vs 404 · 404 not-found · 409 conflict · 422 state violation · 429 overload · 500 error · timeout) |
| **NFR** non-functional specs | **56** (`NFR-015`~`NFR-070`) | Adjudicates **all 30 P0 requirements** of `quality-bar.md` against that screen. An `applicability` axis (`direct` / `inherited` / `N/A`) screens for whether the surface exists at all, then adds performance budgets · resilience · data retention |

### The canon — [`specs/quality-bar.md`](specs/quality-bar.md)

9 dimensions (STATE · TOKEN · COMP · FEEDBACK · A11Y · MOTION · IA · ERP · EXC) · **100 requirements**, of which the **30 P0s are non-negotiable**. Every batch takes this document as its acceptance criteria. NFRs never restate a requirement's wording — they **reference it by ID only**, so the canon lives in exactly one place.

### BE is not "what was built" — it's "what is to be built"

**There is no backend yet.** `BE-*` are specs for a backend developer to implement, written from the `// TODO(backend)` seams planted in the code. **No endpoint is invented without an FS element behind it** — every endpoint cites the FS element number that justifies it, and anything without one is recorded in §1 "out of scope" with a reason. `openapi/openapi.yaml` has the same character: a document, not a server.

---

## Gate checks

### A check that exists and a check that works are not the same thing.

This is the most expensive lesson in this repo. **Gates accept only the latter as evidence.**

Four **vacuous passes** found in practice — all of them were showing green, and none of them guaranteed anything.

| What | How it lied | Resolution |
| --- | --- | --- |
| `pnpm test` | `--passWithNoTests` → **green on 0 tests** | Flag removed — **152** tests today |
| **62** Storybook play functions | **0** `expect` · **0** spies → **a check that cannot fail** | Assertions injected |
| `bundle-size` CI job | Green with no dist | **Removed** rather than revived → **restored** once it could actually measure, and folded into `verify:all` (`perf:gate`) ([ADR-0009](docs/adr/0009-ci-and-code-quality-gates.md)) |
| `tools/vrt` | 0 baseline images → "0 failures out of 0 comparisons → **PASS**" | `NOT_VERIFIED` (exit 2) when premises are missing — **501** baselines registered, so it now actually compares pixels |

**A proposition that is true over the empty set proves nothing.** Not measurable is not a pass — without premises, the tool emits `NOT_VERIFIED` instead of green.

### Commands

```bash
pnpm validate:contracts   # contract schema validation
pnpm contract-test        # four-way agreement
pnpm coverage:check       # contract states · blockedWhen · FS exception axes (not line %)
pnpm quality:check        # 6 clean-code axes (1 blocker → PR blocked)
pnpm naming:check         # naming rules
pnpm lint && pnpm format:check
pnpm test                 # only tests with assertions count as tests
pnpm verify:all           # all of the above + codegen reproducibility + tsc --noEmit + bundle budget
pnpm verify:full          # verify:all + E2E
```

---

## Repository structure

The product surface is as follows — this is not an exhaustive listing of every top-level directory in the repository.

```
├── contracts/              38 component contracts (SSOT) + schemas/
├── tokens/                 tokens.json (W3C DTCG, 3 tiers)
├── packages/ui/            @tds/ui — atoms/molecules/organisms/templates · foundations/ · generated/(do not edit)
├── apps/admin/             React Admin app
├── specs/                  196 screen specs — FS-*(exhaustive element numbering + 7 exception axes) · BE-*(9 exception axes) · NFR-*(all 30 P0s adjudicated) · quality-bar.md
├── openapi/                OpenAPI 3.1 schema (document — not a server)
├── e2e/                    Playwright scenarios (test names cite FS element numbers)
├── tools/
│   ├── codegen/            contracts/tokens → 4-target generation pipeline
│   ├── contract-test/      four-way agreement verification
│   ├── test-coverage/      contract states · blockedWhen · FS exception-axis coverage (not line %)
│   ├── code-quality/       6 clean-code axes (coupling·leakage·duplication·complexity·dead code·layering)
│   ├── vrt/                Visual Regression (501 baseline images)
│   ├── drift/              Design Drift watch
│   ├── a11y/               Accessibility audit
│   ├── perf/               Performance budget audit
│   ├── reuse-guard/        Duplicate component blocking
│   ├── naming-guard/       Naming rule enforcement
│   └── figma-plugin/       Contract/Token → Figma auto-generation
├── docs/
│   ├── adr/                Architecture Decision Records (0001~0010)
│   ├── architecture/       Frontend conventions
│   ├── plan/               Planning documents
│   ├── figma/              Figma spec mirror + review
│   ├── tds/                Design system docs
│   └── _templates/         Standard doc templates
└── reports/                Verification artifacts (gate inputs — machine-generated, excluded from formatter)
```

pnpm workspace: `packages/*` · `apps/*` · `tools/*` · `e2e`.

---

## Library specification

There is one selection criterion — **don't build it yourself.** Problems with a standard answer (form state, server cache, schema validation, routing) use a proven library, and this repo keeps only what is genuinely its own on top: **contracts · tokens · gates**.

### Runtime — `apps/admin`

| Library | Version | Role | Why |
| --- | --- | --- | --- |
| `react` · `react-dom` | ^18.3 | UI rendering | Concurrent rendering · ecosystem |
| `react-router-dom` | ^6.28 | Routing | The route array is the single source in [App.tsx](apps/admin/src/App.tsx) — code detects dead sidebar links |
| `@tanstack/react-query` | ^5.101 | Server state (fetch · cache · invalidation) | Wraps the fixtures behind the `data-source` adapter. Screen code stays unchanged once the backend lands |
| `zustand` | ^5.0 | Client global state | A minimal store with no boilerplate — its scope is narrow because Query owns server state |
| `react-hook-form` | ^7.81 | Form state | Uncontrolled by default, minimal re-renders on large forms |
| `zod` | ^4.4 | Schema validation | RHF resolver + runtime boundary validation. Types are inferred from the schema |
| `axios` | ^1.18 | HTTP client (instance + interceptors) | Real network calls: **zero** — fixtures are plugged into the `adapter` extension point so the **interceptors carry load**. Left as scaffolding it would be dead code. The day a backend lands, one `adapter` line goes away |

### Design system — `packages/ui`

| Library | Version | Role | Why |
| --- | --- | --- | --- |
| `@radix-ui/react-dialog` | 1.1.19 | Focus trap · scroll lock for `Modal` · `ConfirmDialog` | A hand-rolled focus trap produced 3 real defects. Dialog accessibility is not a build-it-yourself problem |
| `@tiptap/*` (`core` · `react` · `pm` · `starter-kit` · `extension-image`) | 3.28.0 | Editor core for `RichTextField` | ProseMirror-based — the document model is a schema, not the DOM |
| `dompurify` | 3.4.12 | Sanitizes editor HTML | An XSS boundary. Not something to build yourself |

| Tool | Version | Role |
| --- | --- | --- |
| `storybook` · `@storybook/react-vite` | ^8.6 | Component docs · state catalog (the evidence a review gate consumes) |
| `@storybook/addon-interactions` · `@storybook/test` | ^8.6 | play function — **it counts as a check only if it asserts** |
| `@storybook/addon-a11y` | ^8.6 | Per-story accessibility checks |
| `@storybook/addon-essentials` | ^8.6 | controls · viewport · docs |

Design values come from [tokens/tokens.json](tokens/tokens.json), not from a library — **W3C DTCG** format, 3 tiers (primitive → semantic → component), with light/dark modes recorded in `$extensions['tds.modes']`.

### Build · types

| Tool | Version | Role |
| --- | --- | --- |
| `vite` | ^5.4 | Dev server · bundling (shared with the Storybook builder) |
| `typescript` | ^5.6 | `strict` · `pnpm -r exec tsc --noEmit` is part of `verify:all` |
| `pnpm` | 9.15 | workspace · `workspace:*` internal links |
| `node` | ≥ 20 | Pinned via `engines` |
| `openapi-typescript` | ^7.13 | `openapi.yaml` → types. For bidirectional compile verification at the adapter boundary (**not a server**) |

### Quality

| Tool | Version | Role |
| --- | --- | --- |
| `vitest` · `jsdom` | ^2.1 · ^25 | Unit/component tests (`--passWithNoTests` **prohibited**) |
| `@testing-library/react` · `user-event` · `jest-dom` | ^16 · ^14 · ^6 | Test from the user's perspective, not the implementation's |
| `@playwright/test` | 1.61.1 | E2E — test names cite `FS-NNN` element numbers |
| `eslint` (flat) · `typescript-eslint` | ^9.17 · ^8.18 | Lint foundation |
| `eslint-plugin-react` · `react-hooks` · `jsx-a11y` · `import-x` | — | Accessibility · hook rules · deep import blocking |
| `eslint-config-prettier` | ^10.1 | Removes format rule conflicts |
| `prettier` | ^3.9 | Formatting (`format:check` is a gate) |
| `husky` | ^9.1 | Commit hooks |

The lint setup carries custom rules unique to this repo — **no hardcoded hex/px** (`no-restricted-syntax`), **no `@tds/ui` deep imports** (`no-restricted-imports`). It isn't a rule that stops you; it's the build.
