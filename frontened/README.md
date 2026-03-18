# Career Board

A public careers listing application built with React, TypeScript, and Vite. Features a job listing page, job detail page, and application flow with validation and duplicate prevention.

## Architecture

Frontend-only with an in-memory mock API layer simulating full-stack:

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Data Layer:** In-memory store with typed API functions (`src/lib/api.ts`)
- **Validation:** Zod schemas
- **Animations:** Framer Motion

## Setup & Run

```bash
npm install
npm run dev
```

## Test

```bash
npx vitest run
```

## Key Behaviors

- Only public jobs visible (draft/closed excluded)
- Invalid job IDs → "Job not found" page
- Form validates on blur and submit
- Duplicate applications (same email + job) blocked
- Success state replaces form after submission
- File upload stubbed (filename reference only)

## Assumptions & Tradeoffs

- **In-memory persistence** — resets on reload
- **No real file uploads** — filename reference only
- **No auth** — user identified by email
- **Client-side API** — structured to convert to Express routes

## What I'd Do Next

- Real backend (Express + MongoDB)
- S3/Cloudinary file uploads
- Search & filter by team/location
- Applicant dashboard with auth
- E2E Playwright tests
