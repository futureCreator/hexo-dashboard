# Mobile Quick Action Hub — Design Spec

## Overview

Redesign the mobile experience of Hexo Dashboard from a scaled-down desktop view into a purpose-built mobile quick action hub. The primary mobile use cases are: AI-powered writing, one-click commit/deploy, and writing streak tracking.

## Approach

**Full-screen mobile views** — On mobile (`< md` breakpoint), modals are replaced with dedicated full-screen pages. Desktop retains existing modal behavior unchanged.

## 1. Mobile Home — Quick Action Hub

On mobile, the home page renders a completely different layout from desktop.

### Layout (top to bottom)

1. **Header** — Logo + "Hexo" title
2. **7-Day Streak Card** — Writing streak visualization
3. **AI Write CTA** — Large gradient button linking to `/write`
4. **Quick Actions** — Commit / Deploy / Clean in a 3-column grid
5. **Recent Drafts** — List of latest draft posts with tap-to-edit

### 7-Day Streak Card

- Large streak number (e.g., "12") with "day streak" label
- 7 colored blocks representing Mon–Sun activity intensity (reusing existing `--heatmap-0` through `--heatmap-4` tokens)
- Today's block: dashed border with "?" if no post yet, filled if written
- Sub-stats: "Best: Xd" and "Year: X" inline
- Data source: same `calcStreaks` logic from `ContributionHeatmap.tsx`, extracted into a shared utility

### AI Write CTA

- Full-width gradient card (accent color)
- Sparkle icon + "AI로 새 글 쓰기" title + subtitle
- Chevron right indicator
- Taps to `router.push('/write')`

### Quick Actions

- 3-column grid: Commit, Deploy, Clean
- Each shows: icon (color-coded), label, status hint (e.g., "3 changes", "Last: 2h ago")
- Actions execute inline with confirmation (no page navigation)
- Reuse existing `CommitButton`, `DeployButton`, `CleanButton` logic

### Recent Drafts

- Section label "Recent Drafts"
- List of latest 2-3 drafts in a card
- Each row: title, "Draft · time ago", chevron
- Taps to `router.push('/edit/[filepath]')`

### Breakpoint behavior

- `< md` (768px): Render mobile quick action hub
- `>= md`: Render existing desktop home layout (no changes)

## 2. Full-Screen Write Page (`/write`)

Replaces `NewPostModal` on mobile. Desktop can also access this route but the primary use case is mobile.

### Layout

- **iOS-style nav bar**: `< Home` back button (left), "New Post" title (center)
- **Segmented control**: Manual / AI Write toggle (same modes as current modal)
- **Scrollable form body**: Full viewport height for form fields
- **Sticky bottom button**: "Create Post" fixed at bottom with safe area padding, always visible

### AI Write mode fields

Same as current `NewPostModal` AI mode:
- Sources (textarea + "Add source" button, max 5)
- My Perspective (textarea, placeholder: "What's your take on this? Any specific angle you want to highlight?")
- Reference Posts (search + checkbox list, max 3)
- Category (chip selector: AI, Blog, Engineering, Cloud, Insight)
- Info bar (Tags: auto, Saved as: draft)

### AI Generating state

Same `AiGeneratingView` component with step indicators, rendered in the form body area.

### Manual mode fields

Same as current `NewPostModal` manual mode: Title, Tags, Categories, Draft toggle.

### Post-creation flow

After successful creation, `router.replace('/edit/[filepath]')` to immediately open the editor for the new post.

### Component architecture

Extract form logic from `NewPostModal` into `components/posts/WriteForm.tsx`:
- `WriteForm` — shared form component (mode toggle, all fields, submission logic)
- `NewPostModal` (desktop) — wraps `WriteForm` in modal chrome
- `/write` page (mobile) — wraps `WriteForm` in full-screen layout with sticky button

## 3. Full-Screen Editor Page (`/edit/[filepath]`)

Replaces `EditModal` on mobile.

### Normal state layout

- **Nav bar**: `< Posts` back button (left), Link button + Save button (right)
- **File info**: Edit icon + filename in monospace + unsaved indicator
- **Editor**: Full-screen `CodeEditor` component (existing CodeMirror setup)
- No bottom tab bar (hidden on full-screen pages)

### Keyboard-up state

- **Compact nav bar**: `< Done` back + filename + Save (smaller sizing)
- **Markdown accessory bar**: Positioned above iOS keyboard, contains `# * - [ ] \`` shortcuts for quick markdown input
- **Editor**: Fills remaining space between nav and accessory bar

### Component architecture

Extract editor logic from `EditModal` into `components/posts/EditorView.tsx`:
- `EditorView` — shared editor component (content loading, saving, drag-drop upload, post link picker)
- `EditModal` (desktop) — wraps `EditorView` in modal chrome
- `/edit/[filepath]` page (mobile) — wraps `EditorView` in full-screen layout with accessory bar

## 4. Routing & Navigation

### New routes

| Route | Purpose | Entry point |
|---|---|---|
| `/write` | Full-screen AI Write / Manual page | Home CTA, Posts page "New" button |
| `/edit/[filepath]` | Full-screen editor | PostCard tap, Recent Drafts tap |

### Mobile/Desktop branching

- Branching uses `useMediaQuery('(max-width: 768px)')` hook or equivalent
- **Desktop**: PostCard "Edit" click → opens `EditModal` (unchanged)
- **Mobile**: PostCard tap → `router.push('/edit/[filepath]')`
- **Desktop**: "New Post" click → opens `NewPostModal` (unchanged)
- **Mobile**: Home CTA / "New Post" → `router.push('/write')`

### Navigation flow (mobile)

```
Home (Quick Action Hub)
  ├── "AI로 새 글 쓰기" → /write (push)
  │     └── Create complete → /edit/[filepath] (replace)
  ├── Recent Drafts item → /edit/[filepath] (push)
  ├── Commit → inline confirm + execute
  ├── Deploy → inline confirm + execute
  └── Clean → inline confirm + execute

Posts tab
  └── PostCard tap → /edit/[filepath] (push)

/write
  └── < Home → router.back()

/edit/[filepath]
  └── < Posts → router.back()
```

## 5. Shared Utilities to Extract

| New file | Extracted from | Purpose |
|---|---|---|
| `components/posts/WriteForm.tsx` | `NewPostModal` | Form logic for both manual and AI write modes |
| `components/posts/EditorView.tsx` | `EditModal` | Editor with content load/save, drag-drop, post link picker |
| `lib/streak.ts` | `ContributionHeatmap` | `calcStreaks` and date utilities for reuse in mobile streak card |
| `hooks/useMediaQuery.ts` | New | Media query hook for mobile/desktop branching |

## 6. What Does NOT Change

- Desktop layout and all desktop interactions remain identical
- Existing `NewPostModal` and `EditModal` continue to work on desktop
- Bottom tab bar behavior (Home, Posts, Analytics, Settings)
- Sidebar navigation on desktop
- All API endpoints remain the same
- All existing components not mentioned above remain untouched

## Design References

Mockups saved in `.superpowers/brainstorm/24836-1773676298/`:
- `mobile-home-hub.html` — Quick action hub layout
- `mobile-write-page.html` — Full-screen write page
- `mobile-editor-page.html` — Full-screen editor (normal + keyboard states)
- `streak-visualization.html` — Streak visualization options (chosen: B)
