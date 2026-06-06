# AGENTS.md — Mixpanel Tracking Reference

> Read this before adding any Mixpanel tracking to Revise Wallah.

## Project Setup

| Field | Value |
|---|---|
| Platform | Web (Next.js App Router) |
| SDK | `mixpanel-browser` (npm) |
| Token location | `NEXT_PUBLIC_MIXPANEL_TOKEN` in `.env.local` |
| Init file | `lib/mixpanel.ts` |
| Init called | `components/MixpanelProvider.tsx` (mounted in root layout) |
| ID Merge mode | Simplified API |
| CDP | None |
| EU/CA users | No consent gate required (India-focused product) |

## Identity Flow

On signup: identify → setProfile → setSuperProperties → track("sign_up_completed")
On login:  identify → setSuperProperties → track("login_completed")
On re-open: identify (dashboard mount)
On logout: reset()

## Naming Conventions

- Event names: object_verb snake_case — e.g. study_kit_generated
- Property names: snake_case — e.g. sign_in_method, plan_type
- Property values: lowercase strings
- No $ or mp_ prefixes on custom properties

## Value Moment

study_kit_generated — notes, flashcards, quiz generated from a YouTube URL

## Key Events

sign_up_completed, login_completed, logout_clicked, page_viewed,
upgrade_clicked, study_kit_generated, quiz_completed, flashcard_reviewed,
export_triggered, payment_completed, minutes_depleted
