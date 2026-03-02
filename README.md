# Hexo Dashboard

A local dashboard for managing Hexo blog posts — built with Next.js 15, TypeScript, and Tailwind CSS v4.

## Features

- Browse published posts and drafts from your Hexo blog
- Create new posts with title, date, tags, and categories
- Edit post content and front matter directly in the browser
- Delete posts with a confirmation modal
- Open posts in your local editor (e.g. VS Code)
- Commit changes to git with a built-in staging UI
- Deploy your blog with a single click (`hexo deploy`)
- Live file-watching via SSE — post list updates automatically when files change
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
| GET/DELETE | `/api/posts` | List and delete posts |
| GET | `/api/posts/content` | Read raw post file content |
| POST | `/api/deploy` | Run `hexo deploy` |
| POST | `/api/git/commit` | Stage and commit changes via git |
| POST | `/api/open` | Open a file in the local editor |
| GET | `/api/watch` | SSE stream for file-system changes |
