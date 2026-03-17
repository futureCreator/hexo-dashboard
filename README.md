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

### v1.0.0 - 2026-03-17
- **Mobile-first Posts page redesign** — fully reworked layout for mobile with Apple HIG compliance
- Added **iOS-style swipe actions** on post cards — swipe left to delete, swipe right to toggle publish/draft; includes rubber-band physics, auto-close on scroll, and single-card-open enforcement
- Added **FAB (Floating Action Button)** for new post creation on mobile — positioned above bottom tab bar with spring animation
- Added **chevron indicators** on mobile post rows for navigation affordance
- Hidden desktop-only controls on mobile: Clean/Commit/Deploy buttons, date range filter, live indicator
- Added full-screen mobile editor routing — tapping a post navigates to `/edit?path=...` instead of opening a modal
- Added **mobile home components**: streak card, quick action hub, recent drafts
- Added **full-screen `/write` page** for mobile new post creation
- Added **Markdown accessory bar** with keyboard height detection for mobile editing
- Extracted `PostEditor` from `EditModal` and `WriteForm` from `NewPostModal` for code reuse
- Reorganized routes into `(dashboard)` and `(fullscreen)` route groups
- Extracted `useClean`, `useCommit`, `useDeploy` action hooks from button components
- Added `useMediaQuery` and `useIsMobile` hooks
- Added Pretendard variable font for Korean typography
- Fixed `.env.production` basePath configuration

### v0.1.19 - 2026-03-12
- Localized **AI Writing Coach** card UI strings from Korean to English (`WritingCoachCard`)
- Fixed `{% post_link %}` slug generation in `EditModal` — strips date prefix (e.g. `20260101-`) from filenames so generated tags resolve correctly
- Added `.claude` to `.gitignore`

### v0.1.18 - 2026-03-09
- Added **Tags** page (`/tags`) — word cloud visualization (`react-d3-cloud`) with sortable tag list, inline rename, and delete (removes `{% post_link %}` references across posts); added `/api/tags` GET/PATCH/DELETE endpoint and **Tags** nav item in sidebar
- Added `findPostLinkReferences`, `cleanPostLinkReferences`, and `updateTagInPosts` helpers to `lib/hexo.ts`
- Redesigned **design tokens** in `globals.css` to follow Apple Human Interface Guidelines — iOS system-grouped backgrounds, label hierarchy, system fills, opaque separators, and semantic colors (success, warning, error) for both light and dark appearances; dark mode now uses true black (`#000000`) optimised for OLED
- Redesigned **DashboardLayout** with an iOS-style page title header and a responsive bottom tab bar for mobile navigation
- Refactored **Sidebar** for a more compact, native-feeling look
- Simplified **Posts** page header (removed redundant action buttons from header row; actions remain in post cards)
- Refactored **Settings** page into `SectionHeader` / `FormGroup` / `FormRow` sub-components for improved readability

### v0.1.17 - 2026-03-08
- Added **Links** page (`/links`) — interactive force-graph visualization of internal post links (`{% post_link %}` and Markdown links), including broken-link detection; added `react-force-graph-2d` dependency and **Links** nav item in sidebar
- Added **post link picker** in `EditModal` — toolbar button opens a searchable panel to insert `{% post_link slug "Title" %}` tags at cursor; replaced the previous AIToolbar
- Added in-memory **posts cache** in `lib/hexo.ts` with `invalidatePostsCache()` — called on file-watch events and all mutating API routes (create/delete/update/content write) to avoid re-scanning disk on every read
- AI Write route now generates related-post links using `{% post_link %}` tags instead of absolute URLs
- Added `slug` field to `HexoPost` interface; used when resolving post links in the link graph

### v0.1.16 - 2026-03-07
- Replaced plain `<textarea>` in `EditModal` with a **CodeMirror** editor (`CodeEditor` component) — syntax highlighting, proper Tab handling, and CodeMirror selection API for AI toolbar
- Added **drag-and-drop image upload** in the editor — drop an image to upload via `/api/media/upload` and auto-insert the Markdown image tag
- Added **Media** page and `/media` nav item for browsing uploaded images
- Added **콘텐츠 통계** (Content Stats) tab in Analytics — total posts/words/reading time, avg word count, monthly avg word length bar chart, and monthly detail table
- Added **AI Writing Coach** card on the Home dashboard
- AI Write API now appends a **related posts** section (tag + title scored) to generated content
- Added `n`/`N` keyboard shortcut on Posts page to open the New Post modal
- Extended New Post reference-post search to match post **content** in addition to title
- Changed default UI font from Inter to **Noto Sans KR**
- Removed PWA support (`@ducanh2912/next-pwa`) and `app/manifest.ts`

### v0.1.15 - 2026-03-07
- Increased recent posts display on Home dashboard from 6 to 8

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
