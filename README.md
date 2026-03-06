# Hexo Dashboard

A local dashboard for managing Hexo blog posts and pages — built with Next.js 15, TypeScript, and Tailwind CSS v4.

## Features

- Browse published posts and drafts from your Hexo blog
- Manage static pages (About, Contact, etc.) from a dedicated Pages view
- Create new posts with title, date, tags, and categories
- Edit post and page content and front matter directly in the browser
- Delete posts and pages with a confirmation modal
- Open posts in your local editor (e.g. VS Code)
- Commit changes to git with a built-in staging UI
- Deploy your blog with a single click (`hexo deploy`)
- Live file-watching via SSE — post list updates automatically when files change
- Contribution heatmap — visualize your post activity at a glance
- Dark / Light / System theme with no flash on load
- Configure your Hexo project path via the Settings page

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion**
- **gray-matter** — parses Markdown front matter

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

On first run, go to **Settings** and set the path to your Hexo project directory. The config is saved to `~/.hexo-dashboard-config.json`.

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/settings` | Read and write dashboard settings |
| GET/DELETE/POST | `/api/posts` | List, delete, and create posts |
| GET/PUT | `/api/posts/content` | Read and write post file content |
| GET/DELETE/POST | `/api/pages` | List, delete, and create static pages |
| GET/PUT | `/api/pages/content` | Read and write page file content |
| POST | `/api/deploy` | Run `hexo deploy` |
| POST | `/api/git/commit` | Stage and commit changes via git |
| POST | `/api/open` | Open a file in the local editor |
| GET | `/api/watch` | SSE stream for file-system changes |

## Changelog

### v0.1.14 - 2026-03-07
- Enhanced **Home dashboard** with top categories, top tags, and 12-month activity charts
- Added `HomeNewPostButton` and `MonthlyBarChart` components for better home page organization
- Refactored `ContributionHeatmap` component for improved maintainability

### v0.1.13 - 2026-03-07
- Extended analytics period selector from 2 options (7/30 days) to 4 options: **7, 14, 30, 90 days** — for both Google Analytics and Search Console tabs
- API routes now accept all four period values with proper validation (falls back to 7 days for unknown values)
- Simplified chart section headings (removed redundant "last N days" suffix)

### v0.1.12 - 2026-03-07
- Added **Home dashboard** — overview page with stat cards (total, published, drafts, written today), recent posts list, quick action links, and site info (URL, last generated, most recent post)
- Added **Home** nav item to sidebar with house icon; fixed active-state detection for root route

### v0.1.1
- Added **Pages** management — create, edit, and delete static Hexo pages (`source/<slug>/index.md`)
- Added **Contribution Heatmap** — GitHub-style activity heatmap on the Posts page
- `EditModal` now accepts a `contentApiBase` prop so it can be reused for both posts and pages

### v0.1.0
- Initial release: post browsing, editing, dark mode, git commit UI, deploy button, file watcher
