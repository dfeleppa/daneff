# Task Management App

A modern task management application built with Next.js, similar to Monday.com or ClickUp.

## Features

- 📋 Task boards with drag & drop functionality
- 👥 User management and permissions
- 📊 Dashboard and analytics views
- 🎯 Priority levels and status tracking
- 📅 Task assignments and due dates
- ⚡ Real-time updates and collaboration

### Header / Page Layout Pattern

Pages rendered inside the authenticated application shell (`AppLayout`) now use a standardized lightweight header stack:

1. Global Top Bar (from `AppLayout`): dark blue bar with dynamic page title + user menu.
2. Breadcrumb Bar (fixed, directly under the top bar) provided by `Breadcrumb`.
3. Optional Actions / View Tabs Bar (if `actions` passed to `AppLayout`).
4. Page-level context header (optional) via `PageHeader` component for Workspace / Project summary meta.

`PageHeader` intentionally keeps titles compact (`text-xl`) and moves supplementary info into a subdued meta row. Avoid large hero titles to maintain information density.

Example usage:

```tsx
import PageHeader from '@/components/PageHeader'

<PageHeader
	overline="Project"
	title={project.name}
	meta={(
		<div className="flex items-center text-xs sm:text-sm text-gray-500 gap-x-4">
			<span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-medium">Active</span>
			<span>Created {new Date(project.created_at).toLocaleDateString()}</span>
			{project.description && <span className="truncate max-w-xs hidden sm:inline">{project.description}</span>}
		</div>
	)}
	actions={(
		<button className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm">New Task</button>
	)}
/>
```

Guidelines:
- Keep `title` concise; rely on breadcrumb for hierarchy.
- Prefer `meta` chips / inline muted text for status, dates, role, etc.
- Use `actions` for primary contextual button(s) only.
- Add `tabs` prop if a local view switcher is needed (reuses existing `ViewsTabBar`).

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: TBD
- **Authentication**: TBD

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development Guidelines

- Use functional components with React hooks
- Implement responsive design principles
- Follow Next.js best practices for routing and API routes
- Use TypeScript interfaces for data models
- Implement proper error handling and loading states

## Project Structure

```
src/
├── app/          # App Router pages and layouts
├── components/   # Reusable UI components
├── lib/         # Utility functions and configurations
└── types/       # TypeScript type definitions
```

## License

MIT
