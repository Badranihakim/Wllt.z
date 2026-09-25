# wllt.z — Full Production PRD Structure (AI-Ready)

## 1. Executive Summary

* Product overview
* Core philosophy
* Value proposition
* Unique selling points
* Architecture summary
* Technical direction

---

## 2. Product Vision

### Vision Statement

“Aplikasi keuangan modern dengan data sepenuhnya milik pengguna.”

### Product Philosophy

* Privacy-first
* Local-first
* Backendless-first
* User-owned data
* Offline-capable
* Zero operational cost

### Positioning

Modern personal finance tracker powered by:

* React
* Google Sheets
* IndexedDB
* PWA architecture

---

## 3. Target Users

### Primary Audience

* Personal finance users
* Small family finance tracking
* Tech-savvy users
* Privacy-conscious users
* Portfolio/demo audience

### Secondary Audience

* Students
* Freelancers
* Small communities

---

## 4. Core Features (MVP)

### Authentication

* Google OAuth only
* Google Identity Services
* No email/password auth
* No guest mode

### Financial Management

* Income tracking
* Expense tracking
* Wallet/account transfer
* Credit card/debt tracking

### Categories

* Default categories
* User custom categories
* Edit/delete support

### Budgeting

* Monthly budgets
* Saving goals
* Recurring transactions

### Analytics

* Monthly cashflow
* Expense category charts
* Budget progress
* Net worth trends

### Transaction Features

* Notes
* Receipt attachment
* Location
* Search & filters
* Calendar view

---

## 5. Architecture Overview

### System Type

Pure Client-Side Architecture

### Hosting

* Cloudflare Pages
* Zero backend servers

### Frontend Stack

* React
* Vite
* TypeScript
* Tailwind CSS
* shadcn/ui

### State Management

* Zustand
* React Query

### Offline Storage

* IndexedDB
* Dexie.js

### Cloud Storage

* Google Sheets API
* Google Drive App Folder

---

## 6. Data Ownership Philosophy

### Core Principle

All financial data belongs entirely to the user.

### Technical Implications

* No developer-owned database
* No server-side storage
* No analytics tracking
* No centralized data warehouse

### Security Model

* OAuth token stored locally
* drive.file scope only
* No access to unrelated Drive files

---

## 7. Sync Engine Specification

### Sync Architecture

Local-first sync model:
UI → Zustand → IndexedDB → Sync Queue → Google Sheets API

### Sync States

* local_only
* syncing
* synced
* failed
* conflict

### Conflict Resolution

MVP strategy:

* Last Write Wins (LWW)

### Sync Optimizations

* Debounce sync
* Batch sync
* Retry mechanism
* Background queue

### Offline Support

* Full transaction creation offline
* Queue persistence
* Auto-resume sync

---

## 8. Google Sheets Database Design

### Spreadsheet Tabs

* Transactions
* Categories
* Wallets
* Budgets
* Settings

### Schema Versioning

Settings:
SCHEMA_VERSION=1

### Transaction Structure

Fields:

* uuid
* created_at
* updated_at
* deleted_at
* is_deleted
* type
* amount
* category
* wallet
* notes
* receipt_url
* location
* sync_status

### UUID Strategy

Use:
crypto.randomUUID()

Never use spreadsheet row index.

---

## 9. Attachment System

### Receipt Upload Flow

* Upload image to Google Drive App Folder
* Store URL in spreadsheet
* No Base64 storage

### File Handling

* Image compression before upload
* WebP optimization
* Lazy loading previews

---

## 10. Offline-First UX Strategy

### Instant Loading

App loads from IndexedDB first.

### Optimistic UI

Transactions appear immediately before cloud sync.

### Error Recovery

Human-readable errors for:

* expired tokens
* quota exceeded
* malformed spreadsheet
* internet unavailable

### Recovery Actions

* retry sync
* relogin
* recreate spreadsheet
* reconnect Drive

---

## 11. PWA Specification

### Requirements

* Installable
* Standalone mode
* Splash screen
* Offline support

### Mobile UX

* Bottom navigation
* Safe-area support
* Thumb-friendly interactions
* Haptic-like animations

### Performance Targets

* First load <2s
* Subsequent load <500ms
* IndexedDB hydration <100ms

---

## 12. UI/UX Design Language

### Style Direction

* Modern fintech
* Premium Frosted Glassmorphism (iOS-style)
* Clean Light UI

### Design Characteristics

* Large rounded corners
* Vivid Electric Blue and sharp Emerald colors
* Blur effects
* Spacious whitespace

### Theme Strategy

* Auto system theme
* Light mode prioritized by default

---

## 13. Folder Architecture

### Proposed Structure

/src
/app
/components
/features
/services
/repositories
/hooks
/stores
/sync
/db
/schemas
/utils
/pages
/layouts
/workers

### Repository Layer

Abstracted data access:

* GoogleSheetsRepository
* IndexedDBRepository
* FutureSupabaseRepository

---

## 14. API Integration Specification

### Google APIs

* Google Identity Services
* Google Sheets API
* Google Drive API

### Required Scopes

https://www.googleapis.com/auth/drive.file

### OAuth Flow

* Sign in
* Consent
* Token acquisition
* Silent refresh
* Expiration recovery

---

## 15. Error Handling Strategy

### Error Categories

* Auth errors
* Sync errors
* Quota errors
* Spreadsheet corruption
* Offline/network errors

### UX Rules

* Never crash app
* Always provide recovery CTA
* Preserve unsynced local data

---

## 16. Scalability Roadmap

### Current Architecture

Google Sheets backendless model.

### Future Migration Path

Repository Pattern enables:

* Supabase migration
* Firebase migration
* Appwrite migration

Without frontend rewrite.

---

## 17. Security & Privacy

### Principles

* Minimal OAuth scopes
* No backend storage
* No telemetry
* Local token storage only

### Threat Model

* Token expiration
* Spreadsheet deletion
* Manual spreadsheet corruption

---

## 18. Development Workflow

### Tooling

* ESLint
* Prettier
* GitHub Actions

### Deployment

* GitHub Private Repo
* Cloudflare Pages

---

## 19. AI Integration Future Roadmap

### BYOK AI System

User supplies:

* Gemini API Key
* OpenAI API Key

### AI Features

* Spending analysis
* Financial habit insights
* Smart summaries

---

## 20. MVP Roadmap

### Phase 1

Core finance tracking.

### Phase 2

* Background sync
* Advanced analytics
* Notifications

### Phase 3

* Shared finance
* AI insights
* Multi-device conflict handling

---

## 21. Non-Functional Requirements

### Performance

* Fast startup
* Minimal API calls
* Offline resiliency

### Accessibility

* Mobile-first
* Responsive
* Touch-friendly

### Reliability

* Sync retry
* Data recovery
* Crash-safe storage

---

## 22. Success Metrics

### MVP Metrics

* Sync reliability
* Load performance
* User retention
* Crash-free sessions

---

## 23. Final Technical Direction

wllt.z is a:

* backendless
* local-first
* privacy-first
* user-owned
* mobile-first
  financial management platform powered entirely by frontend technologies and user-controlled cloud storage.
