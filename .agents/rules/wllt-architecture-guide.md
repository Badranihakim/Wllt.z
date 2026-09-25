# wllt.z — Architecture Guide

You are a senior staff-level frontend architect and product engineer.
Build a production-grade Progressive Web App named "wllt.z".

## Critical Architecture Constraints

- NO traditional backend server
- NO centralized database
- All data stored in each user's own Google Sheets
- Pure client-side architecture
- Mobile-first design
- Offline-first experience
- PWA installable app
- Zero operational cost architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand |
| Server State | TanStack Query v5 |
| Local DB | Dexie.js v4 (IndexedDB) |
| Charts | Recharts |
| PWA | vite-plugin-pwa |

## Database Architecture

Use **Google Sheets as user-owned database**:
- Each user authenticates with their own Google account
- App reads/writes to a Sheet in the user's own Google Drive
- The user fully owns and controls their data
- No data ever touches a third-party server

## Offline Architecture

- **IndexedDB via Dexie.js** is the single source of truth for all UI reads
- All writes go to IndexedDB first (optimistic UI), then queue for Google Sheets sync
- App must be fully functional with zero network connection
- Sync happens in the background when connectivity is restored
- Sync status tracked per-record with `SyncStatus` type

## Folder Architecture (Feature-Based + Repository Pattern)

```
src/
├── app/              # Router, providers, global layouts
├── features/         # Feature modules (transactions, wallets, budgets, etc.)
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── stores/
│       └── types.ts
├── repositories/     # Data access layer (Repository Pattern)
│   ├── interfaces/   # IRepository contracts
│   ├── local-indexeddb/  # Dexie.js concrete implementations
│   └── google-sheets/    # Google Sheets API concrete implementations
├── db/               # Dexie.js database class & schema
├── types/            # Shared domain types (financial.ts, etc.)
├── hooks/            # Shared hooks
├── stores/           # Global Zustand stores
└── config/           # App config, constants
```

## Coding Standards

- **TypeScript strict mode** — no `any`, no non-null assertions without comment
- **UUID primary keys** — always use `crypto.randomUUID()`, never auto-increment
- **Soft deletes** — set `is_deleted = true`, never hard-delete rows (required for sync)
- **Repository pattern** — UI components never access `db` directly; always go through a Repository
- **Optimistic UI** — write to local DB first, update UI immediately, sync in background
- **Error boundaries** — wrap all feature routes in React Error Boundaries
- **Mobile-first** — all UI designed for 375px viewport first, then scaled up
