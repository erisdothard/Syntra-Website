# Product

<!-- impeccable:product-schema 1 -->

Scope: the Workforce Navigator demo at `/demo/navigator` only, not the Syntra AI site around it.
Written from the Charlotte Works / CELC RFP ("AI-Enabled Workforce & Ecosystem Navigator") and the
internal demo plan, answered by a structured stand-in for the owner, not a live interview.

## Platform

web

## Users

- Job seekers in Charlotte-Mecklenburg, English or Spanish speaking, mostly on a phone, often under
  pressure (laid off, a first job, a single parent, a bill past due). Their job: say what they need in
  a few taps and leave with one plan they can act on today, or reach a person.
- Charlotte Works staff and partner organizations (staff view): work the referral queue, keep partner
  resource records accurate, see what AI calls cost.
- Evaluators of the RFP: watch a recorded walkthrough and click the live demo.

## Product Purpose

A navigator that helps people articulate goals, circumstances and barriers with low friction, then
returns stabilizing services first, then career steps and training, each with why it fits and what to
do next. Success: a person finishes intake in about two minutes, trusts the plan, and can hand off to a
human at any point.

## Positioning

Hybrid by design: deterministic relational logic decides every match (zero tokens, same answer every
time); token-gated AI only reads free text and rewords returned records, citing record IDs, with a
template fallback. The cost of every model call is shown.

## Operating Context

Phone first (360-430px), sometimes a shared or library computer; low bandwidth; varied literacy. Staff
use it on desktop. The demo runs on Vercel with optional ANTHROPIC_API_KEY.

## Capabilities and Constraints

- Tap-to-answer intake (goal, barriers, education, last job, ZIP, household) with optional free text.
- Editable "Here's what I heard" card before any plan.
- Plan order is fixed: steady things first, career steps, training.
- Crisis phrases (EN/ES) never reach the model; 988, 211 and 911 show at once.
- Consent screen lists exactly what is shared and with whom before any referral.
- All data is sample data; no real provider names, wages or Charlotte Works data.

## Brand Commitments

- Every screen: "Demo with sample data. Not connected to Charlotte Works systems.", "You are using an AI
  assistant", "Talk to a person", EN/ES toggle, footer "Built by Syntra AI · syntraai.tech".
- Not the Syntra launch look: a calm, trustworthy public-service tool.

## Evidence on Hand

None real. No users, outcomes or partners may be claimed. Sample tables live in `data.ts`.

## Product Principles

1. A person is always one tap away.
2. Rules decide; AI only reads and rewords, and says so.
3. Stabilize before advancing.
4. Share nothing without explicit, itemized consent.
5. Plain language in both languages, equal quality.

## Accessibility & Inclusion

WCAG 2.1 AA, mobile-first, English and Spanish at parity, large tap targets, keyboard and screen-reader
complete.
