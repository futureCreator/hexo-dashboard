# Hexo Dashboard

A local dashboard for managing Hexo blog posts — built with Next.js 15, TypeScript, and Tailwind CSS v4.

## Features

- Browse posts and drafts from your Hexo blog
- Delete posts with a confirmation modal
- Deploy your blog with a single click
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
| POST | `/api/deploy` | Run `hexo deploy` |
