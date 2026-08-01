---
name: Onboarding & voice decisions
description: Signup/onboarding architecture rules (no auto tour, Getting Started checklist) and voice/dialer scope (click-to-call now, dialer v2)
type: feature
---
Onboarding (spec §12):
- First "aha" is a clean list — nothing SMS-related may block signup or first search.
- Signup ≤30s: auth + workspace name only. No survey steps.
- Dashboard shows a persistent Getting Started checklist (5 steps, auto-checking, collapsible, hides when complete): first search/upload → review clean list → register texting brand → add sending numbers → launch campaign. Incentive: "Finish setup this week → 500 bonus lead credits."
- One-time welcome banner above it with a link that launches the 60-second tour; dismiss is permanent.
- The product tour NEVER auto-launches. It starts only from the banner link or Help → Tour.
- Brand registration is prompted early (carrier approval takes days) but never forced.

Voice (spec §13):
- No in-app dialer at launch (keypad/recents/queues/recording = v2). Positioning when built: "Call the numbers you can't text."
- Ship now: every phone number renders as a tel: click-to-call link (results, leads library, inbox); inbound call handling per number pool (forward to a user number, else voicemail with recording + transcript in the inbox).
