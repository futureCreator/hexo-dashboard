# Hexo Dashboard

A local dashboard for managing Hexo blog posts and pages — built with Next.js 15, TypeScript, and Tailwind CSS v4. Follows Apple Human Interface Guidelines with mobile-first responsive design.

## Features

### Content Management
- Browse published posts and drafts with real-time file watching (SSE)
- Create, edit, and delete posts with a full-featured **CodeMirror** Markdown editor
- Manage static pages (About, Contact, etc.) from a dedicated Pages view
- **Drag-and-drop image upload** — drop images into the editor to auto-insert Markdown tags
- **Post link picker** — searchable panel to insert `{% post_link %}` tags at cursor
- **Tags management** — word cloud visualization, inline rename, and bulk delete with reference cleanup
- Open files in your local editor (e.g. VS Code)

### AI-Powered Writing
- **AI Writing Coach** — OpenRouter (GPT-5.6 Luna Max) feedback on writing style and readability
- **AI Write** — generate draft posts with related-post links
- **Content Stats** — word count, reading time, readability analysis

### Visualization & Analytics
- **Contribution heatmap** — GitHub-style activity grid
- **Link graph** — force-directed visualization of internal post links with broken-link detection
- **Google Analytics** integration — page views, sessions, and traffic charts
- **Google Search Console** integration — impressions, clicks, and query data
- **Monthly bar charts** — 12-month post volume at a glance

### Mobile Experience (Apple HIG)
- **iOS-style swipe actions** — swipe left to delete, swipe right to toggle publish/draft
- **Full-screen editor pages** (`/edit`, `/write`) for immersive mobile editing
- **Markdown accessory bar** with keyboard height detection
- **Bottom tab bar** navigation with Thumb Zone-optimized layout
- **FAB** for quick post creation
- Streak card, quick action hub, and recent drafts on mobile home

### DevOps
- Commit changes to git with a built-in staging UI
- Clean Hexo cache and deploy with a single click
- Live file-watching via SSE — post list updates automatically
- Dark / Light theme auto-follows system preference (OLED-optimized dark mode)

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | **Next.js 15** (App Router), **React 19** |
| Language | **TypeScript 5** |
| Styling | **Tailwind CSS v4**, CSS custom properties (Apple HIG tokens) |
| Animation | **Framer Motion** |
| Editor | **CodeMirror** (`@uiw/react-codemirror`) |
| Markdown | **gray-matter** (front matter parsing) |
| Charts | **Recharts** |
| Visualization | **react-force-graph-2d** (link graph), **react-d3-cloud** (tag cloud) |
| Analytics | **Google Analytics Data API**, **Google Search Console API** |
| AI | **OpenRouter** (`openai/gpt-5.6-luna`, reasoning effort `max`) |
| Fonts | **Pretendard** (sans), **Calistoga** (display), **JetBrains Mono** (code) |
| Process Manager | **PM2** (`ecosystem.config.js`) |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Deployment

```bash
npm run deploy   # Builds with basePath and restarts PM2
```

Runs on `localhost:4000` behind a reverse proxy at `/proxy/hexo`.

## Configuration

On first run, go to **Settings** and set the path to your Hexo project directory. The config is saved to `~/.hexo-dashboard-config.json`.

### Environment Variables

| File | Variable | Description |
|------|----------|-------------|
| `.env.local` | `OPENROUTER_API_KEY` | OpenRouter API key for AI features |
| `.env.local` | `FIRECRAWL_API_KEY` | Firecrawl API key for source-URL scraping |
| `.env.local` | `PERPLEXITY_API_KEY` | Perplexity API key for AI writing research (`sonar`) |
| `.env.production` | `NEXT_PUBLIC_BASE_PATH` | Base path for reverse proxy (default: `/proxy/hexo`) |

## Project Structure

```
app/
├── (dashboard)/          # Sidebar layout — Home, Posts, Pages, Tags, Links, Media, Analytics, Settings
├── (fullscreen)/         # No sidebar — /write, /edit (mobile-optimized)
├── api/                  # 21 API routes
├── globals.css           # Apple HIG design tokens
└── layout.tsx            # Root layout with fonts & providers

components/
├── editor/               # MarkdownAccessoryBar, useKeyboardHeight
├── home/                 # StreakCard, QuickActions, RecentDrafts, WritingCoachCard, MonthlyBarChart
├── layout/               # Sidebar, DashboardLayout, DarkBackground
├── links/                # ForceGraphView
├── pages/                # PageList, PageCard, NewPageModal
├── posts/                # PostList, PostCard, PostEditor, WriteForm, EditModal, CodeEditor, ContributionHeatmap
├── providers/            # ThemeProvider
├── tags/                 # TagsClient
└── ui/                   # Button, Card, Badge, SectionLabel, Skeleton, Toast

hooks/                    # useMediaQuery, useCommit, useClean, useDeploy
lib/                      # hexo.ts, settings.ts, api.ts, analytics.ts, search-console.ts, link-graph.ts, content-stats.ts, streak.ts
```

## API Routes

### Content Management

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST/DELETE | `/api/posts` | List, create, and delete posts |
| GET/PUT | `/api/posts/content` | Read and write post file content |
| GET/POST/DELETE | `/api/pages` | List, create, and delete static pages |
| GET/PUT | `/api/pages/content` | Read and write page file content |
| GET/PATCH/DELETE | `/api/tags` | List, rename, and delete tags |
| GET | `/api/links` | Build internal link graph |
| GET/POST | `/api/media` | List media files |
| POST | `/api/media/upload` | Upload image files |
| GET | `/api/media/file/[...filepath]` | Serve media files |

### AI & Analytics

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/ai-write` | AI-powered post generation (OpenRouter) |
| GET | `/api/ai-writing-coach` | AI writing feedback |
| POST | `/api/ai` | General AI endpoint |
| GET | `/api/content-stats` | Content readability and statistics |
| GET | `/api/analytics` | Google Analytics data |
| GET | `/api/search-console` | Google Search Console data |

### DevOps & Utilities

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/deploy` | Run `hexo generate && hexo deploy` |
| POST | `/api/clean` | Clean Hexo cache |
| POST | `/api/git/commit` | Stage and commit changes via git |
| POST | `/api/open` | Open a file in the local editor |
| GET/POST | `/api/settings` | Read and write dashboard settings |
| GET | `/api/watch` | SSE stream for file-system changes |

## Changelog

### v1.0.0 — 2026-03-17
- **Mobile-first Posts page redesign** with Apple HIG compliance
- iOS-style swipe actions, FAB, chevron indicators, bottom tab bar
- Full-screen `/edit` and `/write` pages for mobile
- Markdown accessory bar with keyboard height detection
- Mobile home components: streak card, quick action hub, recent drafts
- Route groups: `(dashboard)` and `(fullscreen)`
- Extracted reusable hooks: `useClean`, `useCommit`, `useDeploy`, `useMediaQuery`
- Pretendard variable font for Korean typography

### v0.1.19 — 2026-03-12
- Localized AI Writing Coach card UI to English
- Fixed `{% post_link %}` slug generation (strips date prefix)

### v0.1.18 — 2026-03-09
- Tags page with word cloud, inline rename, and delete
- Apple HIG design tokens overhaul (OLED-optimized dark mode)
- iOS-style page title header and bottom tab bar

### v0.1.17 — 2026-03-08
- Links page with force-graph visualization and broken-link detection
- Post link picker in editor
- In-memory posts cache with invalidation

### v0.1.16 — 2026-03-07
- CodeMirror editor with syntax highlighting
- Drag-and-drop image upload
- Media page, Content Stats tab, AI Writing Coach
- Keyboard shortcut `n`/`N` for new post

### v0.1.15 — 2026-03-07
- Increased recent posts on Home from 6 to 8

### v0.1.14 — 2026-03-07
- Home dashboard: top categories, top tags, 12-month activity charts

### v0.1.13 — 2026-03-07
- Analytics period selector: 7, 14, 30, 90 days

### v0.1.12 — 2026-03-07
- Home dashboard with stat cards, recent posts, site info

### v0.1.1
- Pages management, Contribution Heatmap

### v0.1.0
- Initial release: post browsing, editing, dark mode, git commit UI, deploy, file watcher
