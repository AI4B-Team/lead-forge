---
name: Customer app vs Platform Admin separation
description: Two personas, two apps — /app is customer-only, /platform is owner-only admin; never mix their metrics or navigation
type: feature
---
LeadTrace ships one codebase with two applications sharing the design system, components, and auth:

- **Customer app** (`/app/*`): one business per workspace. Nav = Dashboard, Build, Lists, Leads, AI Agent, Campaigns, Performance, Settings. Customers must never see other workspaces or platform-wide metrics (Total Workspaces, Trial → Paid, MRR, platform SMS totals).
- **Platform Admin** (`/platform/*`): owner/staff only, gated by super_admin. Its own shell — no workspace switcher, no Build List, no customer chrome. Pages: Overview, Workspaces, Source Requests, Admin Access (future: Billing, Credits, Usage, Support, Feature Flags, Logs, System Health).

Entry point: "Platform Admin" item in the profile menu (super admins only); Platform Admin links back with "My Workspace". The owner dogfoods a normal workspace daily and switches into Platform Admin only for business operations. Never add platform-wide tooling into Settings or the customer sidebar.
