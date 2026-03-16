# Mobile Quick Action Hub — Design Spec

## Overview

Redesign the mobile experience of Hexo Dashboard from a scaled-down desktop view into a purpose-built mobile quick action hub. The primary mobile use cases are: AI-powered writing, one-click commit/deploy, and writing streak tracking.

## Approach

**Full-screen mobile views** — On mobile (`< md` breakpoint), modals are replaced with dedicated full-screen pages. Desktop retains existing modal behavior unchanged.

## 1. Mobile Home — Quick Action Hub

On mobile, the home page renders a completely different layout from desktop.

### Server/Client Component Strategy

The existing `app/page.tsx` is an async Server Component (uses `await getDashboardData()`). Since hooks cannot be used in Server Components, the branching strategy is:

- `app/page.tsx` (Server Component) fetches data and renders **both** `<DesktopHome>` and `<MobileHome>` as Client Components, passing server-fetched data as props.
- CSS-based visibility: `<DesktopHome className="hidden md:block">` and `<MobileHome className="md:hidden">`.
- This avoids hydration mismatch from `useMediaQuery` and keeps server-side data fetching benefits.

### Layout (top to bottom)

1. **Header** — Logo + "Hexo" title
2. **7-Day Streak Card** — Writing streak visualization
3. **AI Write CTA** — Large gradient button linking to `/write`
4. **Quick Actions** — Commit / Deploy / Clean in a 3-column grid
5. **Recent Drafts** — List of latest draft posts with tap-to-edit

### 7-Day Streak Card

- Large streak number (e.g., "12") with "day streak" label
- 7 colored blocks representing **the last 7 calendar days** (labeled by weekday name)
- Each block's intensity: post count for that day relative to the **7-day max** (not yearly max), mapped to `--heatmap-0` through `--heatmap-4`
- Today's block: dashed border with "?" if no post yet, filled if at least one post written
- Sub-stats: "Best: Xd" and "Year: X" inline
- Data source: extract `calcStreaks` and `toLocalDateKey` from `ContributionHeatmap.tsx` into `lib/streak.ts`

### AI Write CTA

- Full-width gradient card (accent color)
- Sparkle icon + "AI로 새 글 쓰기" title + subtitle
- Chevron right indicator
- Taps to `router.push('/write')`

### Quick Actions

- 3-column grid: Commit, Deploy, Clean
- Each shows: icon (color-coded), label
- **No status hints** (e.g., "3 changes") — these would require new API endpoints. Keep it simple: just icon + label.
- **Execution model**: Extract async handler logic from existing `CommitButton`, `DeployButton`, `CleanButton` into shared hooks (`useCommit`, `useDeploy`, `useClean`). The mobile quick action cards call these hooks directly.
- **Commit**: Tap → execute immediately, show toast on success/error (same as existing `CommitButton` behavior)
- **Deploy**: Tap → show a bottom sheet with streaming deploy logs (adapted from existing `DeployButton` modal). This is necessary because deploy takes time and the user needs feedback.
- **Clean**: Tap → execute immediately, show toast (same as existing `CleanButton` behavior)

### Recent Drafts

- Section label "Recent Drafts"
- List of latest 2-3 drafts in a card, filtered from the posts data already fetched by the Server Component
- Each row: title, "Draft · time ago", chevron
- Taps to `router.push('/edit?path=<encoded-filepath>')`

### Loading and Error States

- **Loading**: Skeleton cards matching the hub layout (streak card skeleton, CTA skeleton, 3 action card skeletons, draft list skeletons)
- **Not configured** (`!data.configured`): Show the existing setup prompt UI, same as desktop
- **Invalid path** (`!data.valid`): Show the existing invalid path UI, same as desktop

### Breakpoint behavior

- `< md` (768px): Render mobile quick action hub via CSS `md:hidden`
- `>= md`: Render existing desktop home layout via `hidden md:block` (no changes)

## 2. Full-Screen Write Page (`/write`)

Replaces `NewPostModal` on mobile. Desktop can also access this route but the primary use case is mobile.

### Layout

- **iOS-style nav bar**: `< Back` button (left) using `router.back()`, "New Post" title (center)
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

Same `AiGeneratingView` component with step indicators, rendered in the form body area. The sticky bottom button is hidden during generation.

### Manual mode fields

Same as current `NewPostModal` manual mode: Title, Tags, Categories, Draft toggle.

### Post-creation flow

After successful creation, `router.replace('/edit?path=<encoded-filepath>')` to immediately open the editor for the new post.

### Component architecture

Extract form logic from `NewPostModal` into `components/posts/WriteForm.tsx`:

```typescript
interface WriteFormProps {
  onCreated: (post: HexoPost) => void;  // parent decides what to do (close modal vs router.replace)
}
```

- `WriteForm` manages its own internal state (mode, fields, submission, generation steps)
- `WriteForm` calls `onCreated(post)` on successful creation — the parent handles navigation/close
- `AiGeneratingView` moves inside `WriteForm`
- `NewPostModal` (desktop): wraps `WriteForm` in modal chrome, `onCreated` calls `onClose()` + parent callback
- `/write` page (mobile): wraps `WriteForm` in full-screen layout with sticky button, `onCreated` calls `router.replace('/edit?path=...')`

### DashboardLayout handling

The `/write` page opts out of `DashboardLayout` (no sidebar, no bottom tab bar). It renders its own iOS-style nav bar. This is achieved by not nesting under the layout group that includes `DashboardLayout`, or by adding a route group `(fullscreen)` that has its own minimal layout.

## 3. Full-Screen Editor Page (`/edit`)

Replaces `EditModal` on mobile. Uses query parameter for filepath: `/edit?path=<encoded-filepath>`.

### Why query parameter instead of dynamic route

Filepaths contain forward slashes (e.g., `source/_drafts/my-post.md`) which break Next.js single-segment dynamic routes. Using `?path=` with `encodeURIComponent` avoids this cleanly without catch-all routes.

### Normal state layout

- **Nav bar**: `< Back` button using `router.back()` (left), Link button + Save button (right)
- **File info**: Edit icon + filename in monospace + unsaved indicator
- **Editor**: Full-screen `CodeEditor` component (existing CodeMirror setup)
- No bottom tab bar (full-screen page, outside `DashboardLayout`)

### Keyboard-up state

- **Compact nav bar**: `< Done` back + filename + Save (smaller sizing)
- **Markdown accessory bar**: A fixed-bottom bar that repositions using the `visualViewport` API (`visualViewport.resize` event tracks keyboard height). Contains shortcut buttons that each insert a specific string at cursor:
  - `#` → inserts `# ` (heading)
  - `*` → inserts `**` (bold markers)
  - `-` → inserts `- ` (list item)
  - `[]` → inserts `[](url)` (link template)
  - `` ` `` → inserts `` ` `` (inline code)
- **Editor**: Fills remaining space between nav and accessory bar
- **Keyboard detection**: `window.visualViewport.addEventListener('resize', ...)` — when viewport height shrinks significantly (> 150px), switch to keyboard-up compact layout

### Unsaved changes protection

When the user taps the back button with unsaved changes, show an inline confirmation dialog (same as existing `EditModal`'s `showConfirm` overlay). `beforeunload` is not reliable on mobile Safari; instead, intercept the back button click handler directly.

### Component architecture

Extract editor logic from `EditModal` into `components/posts/PostEditor.tsx`:

```typescript
interface PostEditorProps {
  filepath: string;
  filename: string;
  onSaved: () => void;
  contentApiBase?: string;  // preserved for Pages editor compatibility
}
```

- `PostEditor` manages its own state (content, saving, drag-drop, post link picker, unsaved detection)
- `PostEditor` exposes `isDirty` via a ref or callback for the parent to check before navigation
- `EditModal` (desktop): wraps `PostEditor` in modal chrome with header/footer, handles `onClose` with dirty check
- `/edit` page (mobile): wraps `PostEditor` in full-screen layout with nav bar and accessory bar
- The `contentApiBase` prop is preserved so `/edit` can also be used for Pages if needed in the future

## 4. Routing & Navigation

### New routes

| Route | Purpose | Entry point |
|---|---|---|
| `/write` | Full-screen AI Write / Manual page | Home CTA, Posts page "New" button |
| `/edit?path=<filepath>` | Full-screen editor | PostCard tap, Recent Drafts tap |

### Route group structure

```
app/
  (dashboard)/          # existing: DashboardLayout with sidebar + tab bar
    page.tsx            # home
    posts/page.tsx
    analytics/page.tsx
    settings/page.tsx
    ...
  (fullscreen)/         # new: minimal layout, no sidebar/tab bar
    write/page.tsx
    edit/page.tsx
    layout.tsx          # minimal: just ThemeProvider + DarkBackground
```

### Mobile/Desktop branching

- **Home page**: CSS-based (`md:hidden` / `hidden md:block`), no JS branching
- **PostCard / NewPost buttons**: Use `useMediaQuery` hook to decide modal vs router.push
- **Desktop**: PostCard "Edit" click → opens `EditModal` (unchanged)
- **Mobile**: PostCard tap → `router.push('/edit?path=...')`
- **Desktop**: "New Post" click → opens `NewPostModal` (unchanged)
- **Mobile**: Home CTA / "New Post" → `router.push('/write')`
- The existing `HomeNewPostButton` is hidden on mobile (`hidden md:flex`) since the AI Write CTA in the mobile hub replaces it

### Navigation flow (mobile)

```
Home (Quick Action Hub)
  ├── "AI로 새 글 쓰기" → /write (push)
  │     └── Create complete → /edit?path=... (replace)
  ├── Recent Drafts item → /edit?path=... (push)
  ├── Commit → execute + toast
  ├── Deploy → bottom sheet with streaming logs
  └── Clean → execute + toast

Posts tab
  └── PostCard tap → /edit?path=... (push)

/write
  └── < Back → router.back()

/edit?path=...
  └── < Back → router.back() (with dirty check)
```

### Back button labels

All back buttons use generic `< Back` label with `router.back()`. This avoids mismatched labels when the same page is reachable from multiple entry points (e.g., `/edit` reachable from both Home and Posts).

## 5. Shared Utilities to Extract

| New file | Extracted from | Purpose |
|---|---|---|
| `components/posts/WriteForm.tsx` | `NewPostModal` | Form logic for both manual and AI write modes |
| `components/posts/PostEditor.tsx` | `EditModal` | Editor with content load/save, drag-drop, post link picker |
| `lib/streak.ts` | `ContributionHeatmap` | `calcStreaks`, `toLocalDateKey`, and 7-day activity utilities |
| `hooks/useMediaQuery.ts` | New | Media query hook for mobile/desktop branching in interactive components |
| `hooks/useCommit.ts` | `CommitButton` | Commit async handler logic |
| `hooks/useDeploy.ts` | `DeployButton` | Deploy async handler + streaming log logic |
| `hooks/useClean.ts` | `CleanButton` | Clean async handler logic |

## 6. What Does NOT Change

- Desktop layout and all desktop interactions remain identical
- Existing `NewPostModal` and `EditModal` continue to work on desktop
- Bottom tab bar behavior (Home, Posts, Analytics, Settings) in `(dashboard)` routes
- Sidebar navigation on desktop
- All API endpoints remain the same
- All existing components not mentioned above remain untouched

## Design References

Mockups saved in `.superpowers/brainstorm/24836-1773676298/`:
- `mobile-home-hub.html` — Quick action hub layout
- `mobile-write-page.html` — Full-screen write page
- `mobile-editor-page.html` — Full-screen editor (normal + keyboard states)
- `streak-visualization.html` — Streak visualization options (chosen: B)
