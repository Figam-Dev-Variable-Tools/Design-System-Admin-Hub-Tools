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

List/detail/create/edit ship as one set, and every component that fills those screens comes from exactly one place, `@tds/ui` — 12 atoms · 20 molecules · 5 organisms, **37 contracts**.

---

## Quick start

> Requirements: **Node ≥ 20** · **pnpm 9.15**

```bash
pnpm install
pnpm codegen              # contracts/tokens → generate types · argTypes · figma.json · CSS
pnpm gate:precheck        # contracts + ownership + naming + four-way agreement (required before requesting review)
pnpm dev:admin            # Admin app
pnpm sb                   # Storybook (:6006)
```

---

## Gate checks

### A check that exists and a check that works are not the same thing.

This is the most expensive lesson in this repo. **Gates accept only the latter as evidence.**

Four **vacuous passes** found in practice — all of them were showing green, and none of them guaranteed anything.

| What | How it lied | Resolution |
| --- | --- | --- |
| `pnpm test` | `--passWithNoTests` → **green on 0 tests** | Removed (A77 blocks it) |
| **62** Storybook play functions | **0** `expect` · **0** spies → **a check that cannot fail** | Assertions injected (A30) |
| `bundle-size` CI job | Green with no dist | Job **removed** ([ADR-0009](docs/adr/0009-ci-and-code-quality-gates.md)) |
| `tools/vrt` | 0 baseline images → "0 failures out of 0 comparisons → **PASS**" | `NOT_VERIFIED` (exit 2) |

**A proposition that is true over the empty set proves nothing.** Not measurable is not a pass — without premises, the tool emits `NOT_VERIFIED` instead of green.

### Commands

```bash
pnpm validate:registry    # A02  50 agents · 11 gates · SKILL consistency
pnpm boundary:check       # A02  ownership boundaries (same rules as CODEOWNERS)
pnpm contract-test        # A74  four-way agreement
pnpm coverage:check       # A77  contract states · blockedWhen · FS exception axes (not line %)
pnpm quality:check        # A83  6 clean-code axes (1 blocker → PR blocked)
pnpm naming:check         # A76  naming rules
pnpm lint && pnpm format:check
pnpm test                 # only tests with assertions count as tests
pnpm verify:all           # all of the above + codegen reproducibility + tsc --noEmit
pnpm verify:full          # verify:all + E2E
```

---

## Repository structure

```
├── orchestration/          A00  Organization SSOT — agent/gate registry, handoff schemas, tasks
├── contracts/              A18  37 component contracts (SSOT) + schemas · review/(A19)
├── tokens/                 A20  tokens.json (W3C DTCG, 3 tiers) · review/(A21)
├── packages/ui/            A30~A33  @tds/ui — atoms/molecules/organisms/templates · foundations/ · generated/(do not edit)
├── apps/admin/             A40~A41  React Admin app (Mid / Senior, sequential exclusive)
├── specs/                  A62~A64  Feature specs FS-* (per-element numbering + 7 exception axes) · BE-* (9 exception axes) · quality-bar.md
├── openapi/                A80  OpenAPI 3.1 schema (document — not a server)
├── e2e/                    A85  Playwright scenarios (test names cite FS element numbers)
├── tools/
│   ├── codegen/                 contracts/tokens → 4-target generation pipeline
│   ├── boundary/           A02  CODEOWNERS generation + ownership/reads scope checks
│   ├── contract-test/      A74  four-way agreement verification
│   ├── test-coverage/      A77  contract states · blockedWhen · FS exception-axis coverage (not line %)
│   ├── code-quality/       A83  6 clean-code axes (coupling·leakage·duplication·complexity·dead code·layering)
│   ├── vrt/                A70  Visual Regression
│   ├── drift/              A71  Design Drift watch
│   ├── a11y/               A72  Accessibility audit
│   ├── perf/               A73  Performance budget audit
│   ├── reuse-guard/        A75  Duplicate component blocking
│   ├── naming-guard/       A76  Naming rule enforcement
│   └── figma-plugin/       A50  Contract/Token → Figma auto-generation
├── docs/
│   ├── adr/                A01  Architecture Decision Records (0001~0010)
│   ├── architecture/       A01  Frontend conventions (required reading for A40/A41/A30) · org audit
│   ├── plan/ design/            A10~A17
│   ├── figma/              A51~A56  Figma spec mirror + review
│   ├── tds/                A60~A61  Design system docs
│   ├── security/           A86  Security review (blocks G6·G9)
│   └── _templates/              Standard docs + gate checklists
├── reports/                Layer 3 verification artifacts (gate inputs — machine-generated, excluded from formatter)
└── skills/                 50 agent SKILL.md files (+ _templates/)
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

### Design system — `packages/ui`

| Library | Version | Role |
| --- | --- | --- |
| `storybook` · `@storybook/react-vite` | ^8.6 | Component docs · state catalog (the evidence for G5) |
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
