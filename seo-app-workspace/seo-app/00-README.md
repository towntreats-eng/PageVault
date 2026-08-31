# SEO APP — WORKSPACE README

This folder is the single source of truth for the SEO app build.
Working name: **ProofSEO** (placeholder).

## What we are building — in one line

A Shopify App Store app that fixes a store's SEO **and proves every single change on the live storefront**, and makes the store visible to AI shopping engines (ChatGPT, Perplexity, Gemini, Google AI Overviews), not just Google.

## Reading order (mandatory for the agent)

| # | File | Read it for |
|---|---|---|
| 00 | `00-README.md` | This file. Orientation. |
| 01 | `01-PRODUCT.md` | Why this app exists, the competitor gaps we attack, what "game changer" means here |
| 02 | `02-SHOPIFY-REALITY.md` | What Shopify actually allows. Scopes, exemptions, deprecations, hard limits. **Read before designing any feature.** |
| 03 | `03-ARCHITECTURE.md` | Stack, data model, system layers, job pipeline |
| 04 | `04-BUILD-PLAN.md` | Phases, deliverables, Definition of Done per phase |
| 05 | `05-TRACKER.md` | The live task table. Update after every task. |
| 06 | `06-RULES.md` | Non-negotiable build rules **including anti-loop rules**. Violating these = work is rejected. |
| 07 | `07-ANTIGRAVITY-PROMPT.md` | The prompt Umang pastes to start/resume a session |
| 08 | `08-APPROVAL-CHECKLIST.md` | Shopify App Store submission readiness |
| 09 | `09-PRICING-AND-COSTS.md` | Where AI is used, real API costs, unit economics, pricing plans |
| 10 | `10-KEYWORD-ENGINE.md` | Keyword research, rank tracking, multi-market targeting, white/black-hat rules |
| 11 | `11-COMPETITOR-PARITY.md` | Full SEOAnt/SEOWILL + TinySEO teardown, feature-by-feature parity verdicts, what we add, what we refuse |
| 12 | `12-UI-UX-SPEC.md` | Information architecture, core UI patterns, screen-by-screen specs, accessibility, screen acceptance checklist |
| 13 | `13-CODE-AUDIT.md` | What the shipped code actually does vs what the tracker claimed. Read before trusting any `BUILT` row. |
| — | `BLOCKERS.md` | Append-only. Every blocker goes here, then STOP. |
| — | `DECISIONS.md` | Append-only. Every architecture decision + reason. |
| — | `reference/` | Superseded original brief, kept for context only. Numbered files always win. |

## The three roles

- **Umang** — owner. He is the only person who can mark anything `VERIFIED`.
- **Claude** — architect and reviewer. Writes specs, audits agent output, catches false claims.
- **Antigravity** — builder. Writes code. Reports honestly. Never self-certifies.

## The one rule that matters most

> **Nothing is "done" until Umang has seen it working with his own eyes on a real, openable URL.**

An agent-written test passing is not proof. A dashboard saying "success" is not proof. A local file path screenshot is not proof. See `06-RULES.md`.

## Status

Phase: **0 — not started**
Market: **global-first** (USD primary, multi-market keyword engine)
Last updated: 31 Aug 2026
