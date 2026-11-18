# RoadmapTrack

RoadmapTrack is an email/password-authenticated React app for tracking an interview-preparation roadmap.

Progress is synchronized with Firebase Cloud Firestore using Redux Toolkit. The roadmap itself remains in `src/data/roadmap.json`.

## Features

- **Dashboard** (`/`) — overall completion, required items remaining, hours completed, today's progress, and progress by area
- **Daily Tracker** (`/daily` and `/daily/:date`) — navigate plan dates, view activities, mark items complete, and mark or clear an entire day
- **Syllabus** (`/syllabus`) — browse activities by area, filter by All/Pending/Done, and jump to daily plans
- **Theme** — light, dark, or system preference synchronized with progress
- **Backup** — export progress as JSON, preview and confirm imports, or reset progress

## Tech Stack

- Vite
- React 18 and TypeScript
- React Router
- Redux Toolkit and React Redux
- Ant Design
- dayjs

## Run Locally

Requires Node.js 20+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```sh
npm run build
```

The production files are generated in `dist/`.

## Browser Storage

Roadmap progress and theme settings are synchronized to Cloud Firestore under
`users/{uid}/progress/main`. The existing `roadmaptrack:v1` localStorage record
is retained as a backup and migration source. On each user's first successful
login, completed activity IDs are merged with any existing Firestore progress;
the local record is not deleted.

## Firebase setup

1. Copy the Firebase web app settings into `.env.local` as `VITE_FIREBASE_*`
   values. This file is ignored by Git.
2. In Firebase Console, enable **Authentication → Email/Password**.
3. Create a Cloud Firestore database and publish the rules in `firestore.rules`.
4. Start the app with `npm run dev`. Create an account or sign in from
   **Settings**. Progress syncs to `users/{uid}/progress/main`.

The Firebase web configuration identifies the project but is not an
authorization secret. Firestore rules enforce per-user access. When deploying,
configure the same `VITE_FIREBASE_*` variables in the hosting environment.

The app also supports development-only date overrides in the URL, for example:

```text
http://localhost:5173/daily?today=2026-11-16
```

## Carried-over tasks

Incomplete, non-stretch activities from prior plan days are shown as carried over on today's Daily Tracker. The `trackingStartDate` in roadmap metadata controls where backlog tracking begins; earlier activities remain visible but are excluded from backlog.
