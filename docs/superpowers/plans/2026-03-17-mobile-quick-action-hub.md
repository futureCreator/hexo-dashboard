# Mobile Quick Action Hub Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the mobile home into a quick action hub with full-screen write/edit pages, replacing modals on mobile.

**Architecture:** Extract shared logic from existing modal components (NewPostModal → WriteForm, EditModal → PostEditor), create a `(fullscreen)` route group for `/write` and `/edit` pages without DashboardLayout, and use CSS-based visibility (`md:hidden` / `hidden md:block`) to branch between mobile and desktop home layouts.

**Tech Stack:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS v4, Framer Motion

**Spec:** `docs/superpowers/specs/2026-03-17-mobile-quick-action-hub-design.md`

---

## File Structure

### New files

```
hooks/useMediaQuery.ts              — SSR-safe media query hook
hooks/useCommit.ts                  — Commit action logic extracted from CommitButton
hooks/useDeploy.ts                  — Deploy action + streaming log logic from DeployButton
hooks/useClean.ts                   — Clean action logic extracted from CleanButton
lib/streak.ts                       — calcStreaks, toLocalDateKey, getLast7Days from ContributionHeatmap
components/posts/WriteForm.tsx      — Shared write form (manual + AI modes) extracted from NewPostModal
components/posts/PostEditor.tsx     — Shared editor (load, save, drag-drop, link picker) from EditModal
components/home/MobileHome.tsx      — Mobile quick action hub (streak, CTA, actions, drafts)
components/home/StreakCard.tsx       — 7-day streak visualization
components/home/QuickActions.tsx     — Commit/Deploy/Clean grid + deploy bottom sheet
components/home/RecentDrafts.tsx     — Recent draft posts list
components/editor/MarkdownAccessoryBar.tsx — Keyboard shortcut bar for mobile editor
components/editor/useKeyboardHeight.ts     — visualViewport keyboard detection hook
app/(fullscreen)/layout.tsx         — Minimal layout: ThemeProvider + DarkBackground, no sidebar/tabs
app/(fullscreen)/write/page.tsx     — Full-screen write page
app/(fullscreen)/edit/page.tsx      — Full-screen editor page
```

### Modified files

```
app/page.tsx                        — Render both DesktopHome + MobileHome with CSS visibility
app/layout.tsx                      — Move to app/(dashboard)/layout.tsx (route group migration)
app/posts/page.tsx                  — Move to app/(dashboard)/posts/page.tsx
app/analytics/page.tsx              — Move to app/(dashboard)/analytics/page.tsx
app/settings/page.tsx               — Move to app/(dashboard)/settings/page.tsx
app/media/page.tsx                  — Move to app/(dashboard)/media/page.tsx
app/links/page.tsx                  — Move to app/(dashboard)/links/page.tsx
app/tags/page.tsx                   — Move to app/(dashboard)/tags/page.tsx
app/pages/page.tsx                  — Move to app/(dashboard)/pages/page.tsx
components/posts/NewPostModal.tsx    — Replace form body with <WriteForm>, keep modal chrome
components/posts/EditModal.tsx       — Replace editor body with <PostEditor>, keep modal chrome
components/posts/PostCard.tsx        — Add useMediaQuery: mobile taps → router.push('/edit?path=...')
components/posts/PostList.tsx        — Add useMediaQuery: mobile "New Post" → router.push('/write')
components/posts/ContributionHeatmap.tsx — Import from lib/streak.ts instead of inline functions
components/posts/CommitButton.tsx    — Use useCommit hook, keep UI chrome
components/posts/DeployButton.tsx    — Use useDeploy hook, keep UI chrome + modal
components/posts/CleanButton.tsx     — Use useClean hook, keep UI chrome
```

---

## Chunk 1: Foundation — Utilities, Hooks, Route Structure

### Task 1: Extract streak utilities to `lib/streak.ts`

**Files:**
- Create: `lib/streak.ts`
- Modify: `components/posts/ContributionHeatmap.tsx`

- [ ] **Step 1: Create `lib/streak.ts` with extracted functions**

Copy these pure functions from `ContributionHeatmap.tsx` (lines ~20-70):

```typescript
// lib/streak.ts
import type { HexoPost } from "@/lib/hexo";

export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function countLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

export interface StreakStats {
  current: number;
  longest: number;
  totalPosts: number;
}

export function calcStreaks(cells: { date: Date | null; count: number }[]): StreakStats {
  // Exact copy from ContributionHeatmap.tsx — preserves Date | null signature
  const real = cells.filter((c) => c.date !== null);
  if (real.length === 0) return { current: 0, longest: 0, totalPosts: 0 };

  const totalPosts = real.reduce((s, c) => s + c.count, 0);

  // Longest streak
  let longest = 0;
  let run = 0;
  for (const c of real) {
    if (c.count > 0) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Current streak: count back from last real cell (today)
  let current = 0;
  for (let i = real.length - 1; i >= 0; i--) {
    if (real[i].count > 0) current++;
    else break;
  }

  return { current, longest, totalPosts };
}

export interface DayActivity {
  date: string;
  dayLabel: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
}

export function buildPostCountMap(posts: HexoPost[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const post of posts) {
    const key = toLocalDateKey(new Date(post.date));
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getLast7Days(countMap: Map<string, number>): DayActivity[] {
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const days: DayActivity[] = [];
  const counts: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    const count = countMap.get(key) ?? 0;
    counts.push(count);
    days.push({
      date: key,
      dayLabel: SHORT_DAYS[d.getDay()],
      count,
      level: 0, // computed after we know max
      isToday: key === todayKey,
    });
  }

  const max = Math.max(...counts, 1);
  for (const day of days) {
    day.level = countLevel(day.count, max);
  }

  return days;
}
```

- [ ] **Step 2: Update `ContributionHeatmap.tsx` to import from `lib/streak.ts`**

Replace inline `toLocalDateKey`, `countLevel`, `calcStreaks` definitions with imports:

```typescript
import { toLocalDateKey, countLevel, calcStreaks } from "@/lib/streak";
```

Delete the inline function definitions (keep everything else).

- [ ] **Step 3: Verify the app still works**

Run: `npm run build` or visit the home page and confirm the heatmap renders correctly.

- [ ] **Step 4: Commit**

```bash
git add lib/streak.ts components/posts/ContributionHeatmap.tsx
git commit -m "refactor: extract streak utilities to lib/streak.ts"
```

---

### Task 2: Create `hooks/useMediaQuery.ts`

**Files:**
- Create: `hooks/useMediaQuery.ts`

- [ ] **Step 1: Create the hook**

```typescript
// hooks/useMediaQuery.ts
"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    function onChange(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
```

Note: `matches` defaults to `false` (SSR-safe). On hydration, it syncs to actual viewport. This means server render always shows desktop layout; CSS `md:hidden` handles the actual visibility.

- [ ] **Step 2: Commit**

```bash
git add hooks/useMediaQuery.ts
git commit -m "feat: add useMediaQuery and useIsMobile hooks"
```

---

### Task 3: Extract action hooks

**Files:**
- Create: `hooks/useCommit.ts`, `hooks/useClean.ts`, `hooks/useDeploy.ts`
- Modify: `components/posts/CommitButton.tsx`, `components/posts/CleanButton.tsx`, `components/posts/DeployButton.tsx`

- [ ] **Step 3a: Create `hooks/useCommit.ts`**

Read `components/posts/CommitButton.tsx` and extract the async logic:

```typescript
// hooks/useCommit.ts
"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { apiUrl } from "@/lib/api";

export type ActionStatus = "idle" | "loading" | "success" | "error";

export function useCommit() {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const { showToast } = useToast();

  const handleCommit = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("loading");
    try {
      const res = await fetch(apiUrl("/api/git/commit"), { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        showToast({ type: "success", message: "Changes committed and pushed to remote." });
      } else {
        setStatus("error");
        showToast({ type: "error", message: data.output || data.error || "Commit failed." });
      }
    } catch {
      setStatus("error");
      showToast({ type: "error", message: "Network error: Failed to reach git commit API." });
    }
    setTimeout(() => setStatus("idle"), 300);
  }, [status, showToast]);

  return { status, handleCommit };
}
```

- [ ] **Step 3b: Create `hooks/useClean.ts`**

Same pattern, read `CleanButton.tsx` for exact API endpoint and toast messages:

```typescript
// hooks/useClean.ts
"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { apiUrl } from "@/lib/api";
import type { ActionStatus } from "@/hooks/useCommit";

export function useClean() {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const { showToast } = useToast();

  const handleClean = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("loading");
    try {
      const res = await fetch(apiUrl("/api/clean"), { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        showToast({ type: "success", message: "Clean succeeded." });
      } else {
        setStatus("error");
        showToast({ type: "error", message: data.output || data.error || "Clean failed." });
      }
    } catch {
      setStatus("error");
      showToast({ type: "error", message: "Network error: Failed to reach clean API." });
    }
    setTimeout(() => setStatus("idle"), 300);
  }, [status, showToast]);

  return { status, handleClean };
}
```

- [ ] **Step 3c: Create `hooks/useDeploy.ts`**

Read `DeployButton.tsx` carefully — it has SSE streaming. Extract the streaming logic:

```typescript
// hooks/useDeploy.ts
"use client";

import { useState, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { apiUrl } from "@/lib/api";
import type { ActionStatus } from "@/hooks/useCommit";

export type DeployStatus = "idle" | "running" | "success" | "error";

export function stripAnsi(str: string) {
  return str.replace(/\x1b\[[0-9;]*[mGKHFJ]/g, "");
}

export function getLineClass(line: string) {
  const l = line.toLowerCase();
  if (l.includes("error") || l.includes("fatal")) return "text-red-400";
  if (l.includes("warn")) return "text-yellow-400";
  if (l.match(/^\s*(info|inf)\s/i)) return "text-sky-400";
  return "text-white/70";
}

export function useDeploy() {
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();

  const handleDeploy = useCallback(async () => {
    if (status === "running" || showModal) return;
    setStatus("running");
    setLogs([]);
    setShowModal(true);

    try {
      const res = await fetch(apiUrl("/api/deploy"), { method: "POST" });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(event.slice(6));
            if (data.type === "log") {
              const line = stripAnsi(data.line);
              if (line.trim()) setLogs((prev) => [...prev, line]);
            } else if (data.type === "done") {
              if (data.success) {
                setStatus("success");
                showToast({ type: "success", message: "Deploy succeeded." });
              } else {
                setStatus("error");
                showToast({ type: "error", message: "Deploy failed." });
              }
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
      showToast({ type: "error", message: "Network error: Failed to reach deploy API." });
    }
  }, [status, showModal, showToast]);

  const handleClose = useCallback(() => {
    if (status === "running") return;
    setShowModal(false);
    setTimeout(() => setStatus("idle"), 200);
  }, [status]);

  return { status, logs, showModal, handleDeploy, handleClose, getLineClass };
}
```

**Important:** Read the actual `DeployButton.tsx` before implementing — the SSE parsing may differ slightly. Match the exact format (`data.type`, `data.message`, etc.).

- [ ] **Step 3d: Update CommitButton, CleanButton, DeployButton to use hooks**

For each button component:
1. Import the corresponding hook
2. Replace inline state + async logic with the hook
3. Keep the UI chrome (button element, keyboard shortcut listener, icons, labels)

Example for CommitButton:
```typescript
// components/posts/CommitButton.tsx — updated
import { useCommit } from "@/hooks/useCommit";

export default function CommitButton() {
  const { status, handleCommit } = useCommit();

  // Keep existing useEffect for keyboard shortcut "c"
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "c") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (status !== "idle") return;
      handleCommit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, handleCommit]);

  // Keep existing JSX return
  return (/* existing button JSX, use status + handleCommit */);
}
```

Same pattern for CleanButton (`useClean`, key "x") and DeployButton (`useDeploy`, key "d").

- [ ] **Step 3e: Verify all three buttons still work**

Run: `npm run build`. Visit posts page, test Commit/Deploy/Clean buttons.

- [ ] **Step 3f: Commit**

```bash
git add hooks/useCommit.ts hooks/useClean.ts hooks/useDeploy.ts \
  components/posts/CommitButton.tsx components/posts/CleanButton.tsx components/posts/DeployButton.tsx
git commit -m "refactor: extract action hooks from button components"
```

---

### Task 4: Route group restructuring

**Files:**
- Move: All existing pages from `app/` into `app/(dashboard)/`
- Create: `app/(dashboard)/layout.tsx` (wraps children with DashboardLayout)
- Modify: `app/layout.tsx` (keep as root layout, remove DashboardLayout if present)

**Important context:** Currently each page manually wraps its content with `<DashboardLayout>`. After migration, `app/(dashboard)/layout.tsx` provides DashboardLayout automatically, so each page removes its own `<DashboardLayout>` wrapper.

- [ ] **Step 4a: Create route group directories**

```bash
mkdir -p app/\(dashboard\) app/\(fullscreen\)
```

- [ ] **Step 4b: Move existing pages into `(dashboard)`**

**IMPORTANT:** Do NOT move these files/directories — they must stay in `app/`:
- `app/api/` — API routes
- `app/layout.tsx` — root layout
- `app/globals.css` — global styles
- `app/favicon.ico`, `app/apple-icon.png` — static assets

Only move page directories and the home page:

```bash
# Move all page directories
mv app/posts app/(dashboard)/posts
mv app/analytics app/(dashboard)/analytics
mv app/settings app/(dashboard)/settings
mv app/media app/(dashboard)/media
mv app/links app/(dashboard)/links
mv app/tags app/(dashboard)/tags
mv app/pages app/(dashboard)/pages

# Move home page
mv app/page.tsx app/(dashboard)/page.tsx
```

Verify after each move: `npm run build` to catch issues early.

- [ ] **Step 4c: Create `app/(dashboard)/layout.tsx`**

This layout wraps all dashboard pages with DashboardLayout automatically:

```typescript
// app/(dashboard)/layout.tsx
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

- [ ] **Step 4d: Remove manual `<DashboardLayout>` wrappers from each page**

For each page file (`page.tsx`, `posts/page.tsx`, `analytics/page.tsx`, etc.):
1. Remove the `import DashboardLayout` line
2. Remove the `<DashboardLayout>` wrapper JSX — replace with a fragment `<>...</>` or just return the inner content directly

Check each file — `app/(dashboard)/page.tsx` (home page) is a server component that renders `<DashboardLayout>` at the top level. Remove that wrapper.

Do the same for: `posts/page.tsx`, `analytics/page.tsx`, `settings/page.tsx`, `media/page.tsx`, `links/page.tsx`, `tags/page.tsx`, `pages/page.tsx`.

- [ ] **Step 4e: Create `app/(fullscreen)/layout.tsx`**

Minimal layout without sidebar or tab bar:

```typescript
// app/(fullscreen)/layout.tsx
export default function FullscreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

No `DashboardLayout`, no sidebar, no tab bar. ThemeProvider and ToastProvider are already in the root `app/layout.tsx`.

- [ ] **Step 4f: Create placeholder pages**

```typescript
// app/(fullscreen)/write/page.tsx
export default function WritePage() {
  return <div>Write page — placeholder</div>;
}

// app/(fullscreen)/edit/page.tsx
export default function EditPage() {
  return <div>Edit page — placeholder</div>;
}
```

- [ ] **Step 4g: Verify routing works**

Run: `npm run build`. Check:
- `/` → home page renders with DashboardLayout
- `/posts` → posts page renders with DashboardLayout
- `/write` → placeholder renders WITHOUT DashboardLayout
- `/edit` → placeholder renders WITHOUT DashboardLayout

- [ ] **Step 4h: Commit**

```bash
git add -A
git commit -m "refactor: reorganize into (dashboard) and (fullscreen) route groups"
```

---

## Chunk 2: Shared Components — WriteForm, PostEditor

### Task 5: Extract `WriteForm` from `NewPostModal`

**Files:**
- Create: `components/posts/WriteForm.tsx`
- Modify: `components/posts/NewPostModal.tsx`

- [ ] **Step 5a: Read `NewPostModal.tsx` carefully**

Read the full file at `components/posts/NewPostModal.tsx`. Identify:
- All state variables that belong to the form (mode, title, tags, categories, draft, sources, perspective, aiCategory, selectedRefs, refSearch, allPosts, isGenerating, genStep, isSubmitting)
- The `AiGeneratingView` inline component
- The `clientSlugify` helper
- `handleManualSubmit` and `handleAiSubmit` callbacks
- The JSX for mode tabs, manual form, AI form, info bar

- [ ] **Step 5b: Create `WriteForm.tsx`**

Extract the form into a standalone component:

```typescript
// components/posts/WriteForm.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiUrl } from "@/lib/api";
import type { HexoPost } from "@/lib/hexo";

interface WriteFormProps {
  onCreated: (post: HexoPost) => void;
  /** If true, render the submit button inline at the bottom. If false, parent handles the button. */
  renderSubmitButton?: boolean;
}

// Move AiGeneratingView, clientSlugify, GEN_STEPS here
// Move all form state, handlers, and JSX here
// The component renders: mode tabs + form fields + optional submit button
// It does NOT render modal chrome (backdrop, header, close button)

export default function WriteForm({ onCreated, renderSubmitButton = true }: WriteFormProps) {
  // All state from NewPostModal (mode, fields, submission, generation)
  // All handlers (handleManualSubmit, handleAiSubmit)
  // On success: call onCreated(data.post)
  // Render: mode tabs + conditional form body + optional footer button
}
```

Key design decisions:
- `WriteForm` manages all state internally
- `onCreated` callback — parent decides navigation (modal close vs router.replace)
- `onStateChange` callback — reports `canSubmit`/`isGenerating` state changes to parent for reactive UI updates (avoids the ref-doesn't-trigger-rerender problem)
- `submit` action exposed via `forwardRef` + `useImperativeHandle` (only for the imperative submit call)

```typescript
export interface WriteFormState {
  canSubmit: boolean;
  isGenerating: boolean;
}

export interface WriteFormHandle {
  submit: () => void;
}

interface WriteFormProps {
  onCreated: (post: HexoPost) => void;
  onStateChange?: (state: WriteFormState) => void;
}

const WriteForm = forwardRef<WriteFormHandle, WriteFormProps>(({ onCreated, onStateChange }, ref) => {
  // ...all form state...

  // Report state changes to parent for reactive button rendering
  useEffect(() => {
    onStateChange?.({ canSubmit: mode === "manual" ? canManualSubmit : canAiSubmit, isGenerating });
  }, [canManualSubmit, canAiSubmit, isGenerating, mode, onStateChange]);

  useImperativeHandle(ref, () => ({
    submit: mode === "manual" ? handleManualSubmit : handleAiSubmit,
  }));

  // ...render mode tabs + form body only (no footer button)...
});
```

- [ ] **Step 5c: Update `NewPostModal.tsx` to use `WriteForm`**

```typescript
// components/posts/NewPostModal.tsx — updated
export default function NewPostModal({ isOpen, onClose, onCreated }: NewPostModalProps) {
  const writeFormRef = useRef<WriteFormHandle>(null);
  const [formState, setFormState] = useState<WriteFormState>({ canSubmit: false, isGenerating: false });

  // Keep: mounted, portal, backdrop, modal chrome, header, footer
  // Replace: form body JSX with <WriteForm>
  // Footer buttons use formState for reactivity, ref for submit action

  const handleCreated = useCallback((post: HexoPost) => {
    onClose();
    onCreated(post);
  }, [onClose, onCreated]);

  return createPortal(
    // ...existing modal structure...
    // Body: <WriteForm ref={writeFormRef} onCreated={handleCreated} onStateChange={setFormState} />
    // Footer: <Button onClick={() => writeFormRef.current?.submit()} disabled={!formState.canSubmit}>
    //         {formState.isGenerating ? hide footer : show footer}
  );
}
```

- [ ] **Step 5d: Verify NewPostModal still works**

Run: `npm run build`. Open the posts page, click "New Post", test both Manual and AI Write modes.

- [ ] **Step 5e: Commit**

```bash
git add components/posts/WriteForm.tsx components/posts/NewPostModal.tsx
git commit -m "refactor: extract WriteForm from NewPostModal"
```

---

### Task 6: Extract `PostEditor` from `EditModal`

**Files:**
- Create: `components/posts/PostEditor.tsx`
- Modify: `components/posts/EditModal.tsx`

- [ ] **Step 6a: Read `EditModal.tsx` carefully**

Read the full file. Identify:
- State: content, original, isLoading, isSaving, error, isDragOver, isUploading, showPostPicker, pickerPosts, pickerSearch, pickerLoading
- Refs: codeEditorRef, editorViewRef, dragCounterRef, pickerSearchRef
- Handlers: handleSave, insertTextAtCursor, openPostPicker, handleInsertPostLink, drag-drop handlers
- `isDirty = content !== original`
- The CodeEditor component usage
- Post link picker panel JSX
- Upload overlay JSX

- [ ] **Step 6b: Create `PostEditor.tsx`**

```typescript
// components/posts/PostEditor.tsx
"use client";

import { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EditorView } from "@codemirror/view";
import CodeEditor, { CodeEditorHandle } from "@/components/posts/CodeEditor";
import { useTheme } from "@/components/providers/ThemeProvider";
import { apiUrl } from "@/lib/api";
import type { HexoPost } from "@/lib/hexo";

interface PostEditorProps {
  filepath: string;
  filename: string;
  onSaved: () => void;
  contentApiBase?: string;
}

export interface PostEditorHandle {
  isDirty: boolean;
  save: () => Promise<void>;
  isSaving: boolean;
  insertTextAtCursor: (text: string) => void;
}

const PostEditor = forwardRef<PostEditorHandle, PostEditorProps>(
  ({ filepath, filename, onSaved, contentApiBase = "/api/posts/content" }, ref) => {
    // All editor state from EditModal
    // Content loading, saving, dirty detection
    // Drag-drop upload
    // Post link picker panel
    // Expose isDirty, save, isSaving, insertTextAtCursor via ref

    useImperativeHandle(ref, () => ({
      isDirty,
      save: handleSave,
      isSaving,
      insertTextAtCursor,
    }));

    // Render: CodeEditor + drag overlay + upload overlay + post picker panel
    // Does NOT render: modal backdrop, header bar, footer bar, close/save buttons
  }
);

PostEditor.displayName = "PostEditor";
export default PostEditor;
```

- [ ] **Step 6c: Update `EditModal.tsx` to use `PostEditor`**

```typescript
// components/posts/EditModal.tsx — updated
export default function EditModal({ isOpen, filepath, filename, onClose, onSaved, contentApiBase }: EditModalProps) {
  const editorRef = useRef<PostEditorHandle>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClose = useCallback(() => {
    if (editorRef.current?.isDirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  }, [onClose]);

  // Keep: mounted, portal, backdrop, modal outer frame
  // Keep: header bar with filename, "관련 글" button, Cancel, Save buttons
  // Keep: Cmd+S / Escape keyboard listener
  // Keep: unsaved changes confirm overlay
  // Replace: editor body with <PostEditor ref={editorRef} filepath={filepath} filename={filename} onSaved={onSaved} contentApiBase={contentApiBase} />
  // Header Save button: onClick={() => editorRef.current?.save()}
  // Header "관련 글" button: call through to PostEditor's link picker (expose via ref or add an `openLinkPicker` method)
}
```

The "관련 글" button triggers the post link picker. Add `openLinkPicker()` to the `PostEditorHandle` interface so the parent (EditModal or /edit page) can render its own trigger button and call through to the editor:

```typescript
export interface PostEditorHandle {
  isDirty: boolean;
  save: () => Promise<void>;
  isSaving: boolean;
  insertTextAtCursor: (text: string) => void;
  openLinkPicker: () => void;
}
```

EditModal keeps the "관련 글" button in its header and calls `editorRef.current?.openLinkPicker()`. The /edit page can place a Link button in its nav bar using the same approach.

- [ ] **Step 6d: Verify EditModal still works**

Run: `npm run build`. Open posts page, click a post to edit, test:
- Content loads
- Editing + save works
- "관련 글" link picker works
- Unsaved changes confirmation works
- Image drag-drop works (if testable)

- [ ] **Step 6e: Commit**

```bash
git add components/posts/PostEditor.tsx components/posts/EditModal.tsx
git commit -m "refactor: extract PostEditor from EditModal"
```

---

## Chunk 3: Mobile Pages — Write, Edit, Mobile Home

### Task 7: Create full-screen `/write` page

**Files:**
- Modify: `app/(fullscreen)/write/page.tsx`

- [ ] **Step 7a: Implement the write page**

```typescript
// app/(fullscreen)/write/page.tsx
"use client";

import { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import WriteForm, { WriteFormHandle } from "@/components/posts/WriteForm";
import type { HexoPost } from "@/lib/hexo";

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function WritePage() {
  const router = useRouter();
  const formRef = useRef<WriteFormHandle>(null);
  const [formState, setFormState] = useState<WriteFormState>({ canSubmit: false, isGenerating: false });

  const handleCreated = useCallback((post: HexoPost) => {
    router.replace(`/edit?path=${encodeURIComponent(post.filepath)}`);
  }, [router]);

  return (
    <div className="min-h-dvh bg-[var(--background)] flex flex-col">
      {/* iOS-style nav bar */}
      <div className="sticky top-0 z-10 bg-[color-mix(in_srgb,var(--card)_85%,transparent)] backdrop-blur-xl border-b border-[var(--border)]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center justify-between px-4 h-11">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[var(--accent)] text-[15px] font-medium"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
          <span className="text-[16px] font-semibold text-[var(--foreground)]">New Post</span>
          <div className="w-[60px]" /> {/* Spacer for center alignment */}
        </div>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))]">
        <WriteForm ref={formRef} onCreated={handleCreated} onStateChange={setFormState} />
      </div>

      {/* Sticky bottom button — uses formState (reactive) for conditional rendering */}
      {!formState.isGenerating && (
        <div className="fixed bottom-0 left-0 right-0 z-10 px-4 pt-3 bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent"
          style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
          <button
            onClick={() => formRef.current?.submit()}
            disabled={!formState.canSubmit}
            className="w-full py-4 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-white text-[16px] font-bold rounded-[14px] disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Create Post
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7b: Test the write page**

Visit `/write` on mobile viewport. Check:
- Back button navigates back
- Mode tabs work (Manual / AI Write)
- Form fields are scrollable
- Sticky bottom button is visible
- Create Post works end-to-end

- [ ] **Step 7c: Commit**

```bash
git add app/\(fullscreen\)/write/page.tsx
git commit -m "feat: add full-screen /write page for mobile"
```

---

### Task 8: Create markdown accessory bar and keyboard height hook

**Files:**
- Create: `components/editor/useKeyboardHeight.ts`
- Create: `components/editor/MarkdownAccessoryBar.tsx`

- [ ] **Step 8a: Create keyboard height hook**

```typescript
// components/editor/useKeyboardHeight.ts
"use client";

import { useState, useEffect } from "react";

export function useKeyboardHeight(): { keyboardVisible: boolean; keyboardHeight: number } {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function onResize() {
      const diff = window.innerHeight - (vv?.height ?? window.innerHeight);
      setKeyboardHeight(diff > 150 ? diff : 0);
    }

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  return { keyboardVisible: keyboardHeight > 150, keyboardHeight };
}
```

- [ ] **Step 8b: Create MarkdownAccessoryBar**

```typescript
// components/editor/MarkdownAccessoryBar.tsx
"use client";

interface MarkdownAccessoryBarProps {
  onInsert: (text: string) => void;
  onDismiss: () => void;
}

const shortcuts = [
  { label: "#", insert: "# " },
  { label: "*", insert: "**" },
  { label: "-", insert: "- " },
  { label: "[]", insert: "[](url)" },
  { label: "`", insert: "`" },
];

export default function MarkdownAccessoryBar({ onInsert, onDismiss }: MarkdownAccessoryBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--card)] border-t border-[var(--border)]">
      <div className="flex gap-3.5">
        {shortcuts.map((s) => (
          <button
            key={s.label}
            onClick={() => onInsert(s.insert)}
            className="text-[16px] font-semibold text-[var(--muted-foreground)] active:text-[var(--foreground)] active:scale-90 transition-all w-8 h-8 flex items-center justify-center"
          >
            {s.label}
          </button>
        ))}
      </div>
      <button onClick={onDismiss} className="p-1">
        <svg className="w-5 h-5 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 8c: Commit**

```bash
git add components/editor/useKeyboardHeight.ts components/editor/MarkdownAccessoryBar.tsx
git commit -m "feat: add markdown accessory bar and keyboard height detection"
```

---

### Task 9: Create full-screen `/edit` page

**Files:**
- Modify: `app/(fullscreen)/edit/page.tsx`

- [ ] **Step 9a: Implement the edit page**

```typescript
// app/(fullscreen)/edit/page.tsx
"use client";

import { useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PostEditor, { PostEditorHandle } from "@/components/posts/PostEditor";
import MarkdownAccessoryBar from "@/components/editor/MarkdownAccessoryBar";
import { useKeyboardHeight } from "@/components/editor/useKeyboardHeight";

function EditPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filepath = searchParams.get("path") ?? "";
  const filename = filepath.split("/").pop() ?? "";
  const editorRef = useRef<PostEditorHandle>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const { keyboardVisible } = useKeyboardHeight();

  const handleBack = useCallback(() => {
    if (editorRef.current?.isDirty) {
      setShowConfirm(true);
    } else {
      router.back();
    }
  }, [router]);

  if (!filepath) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--background)]">
        <p className="text-sm text-[var(--muted-foreground)]">No file path provided</p>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-[var(--background)] flex flex-col overflow-hidden">
      {/* Nav bar */}
      <div className="shrink-0 bg-[color-mix(in_srgb,var(--card)_85%,transparent)] backdrop-blur-xl border-b border-[var(--border)]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={handleBack}
            className="flex items-center gap-1 text-[var(--accent)] text-[15px] font-medium">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 18l-6-6 6-6" />
            </svg>
            {keyboardVisible ? "Done" : "Back"}
          </button>
          {keyboardVisible ? (
            <span className="text-xs font-mono text-[var(--muted-foreground)] truncate max-w-[180px]">{filename}</span>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-sm font-mono text-[var(--foreground)] truncate max-w-[200px]">{filename}</span>
            </div>
          )}
          <button
            onClick={() => editorRef.current?.save()}
            disabled={editorRef.current?.isSaving || !editorRef.current?.isDirty}
            className="px-3 py-1.5 bg-[var(--accent)] text-white text-[13px] font-semibold rounded-lg disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <PostEditor
          ref={editorRef}
          filepath={filepath}
          filename={filename}
          onSaved={() => {/* stay on page */}}
        />
      </div>

      {/* Markdown accessory bar (visible when keyboard is up) */}
      {keyboardVisible && (
        <MarkdownAccessoryBar
          onInsert={(text) => editorRef.current?.insertTextAtCursor(text)}
          onDismiss={() => {
            // Blur the editor to dismiss keyboard
            (document.activeElement as HTMLElement)?.blur();
          }}
        />
      )}

      {/* Unsaved changes confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl p-6 w-80 mx-4">
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">Discard changes?</p>
            <p className="text-xs text-[var(--muted-foreground)] mb-5">Your changes will be lost.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--foreground)]">
                Keep editing
              </button>
              <button onClick={() => router.back()}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--error)] text-white">
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-[var(--background)]">
        <div className="text-sm text-[var(--muted-foreground)]">Loading...</div>
      </div>
    }>
      <EditPageContent />
    </Suspense>
  );
}
```

Note: `useSearchParams()` requires a Suspense boundary in Next.js 15 App Router.

- [ ] **Step 9b: Test the edit page**

Visit `/edit?path=source/_drafts/some-post.md` on mobile viewport. Check:
- Content loads from API
- Editing works
- Save button works
- Back button with dirty check works
- Keyboard accessory bar appears when focused (test on actual mobile or simulate)

- [ ] **Step 9c: Commit**

```bash
git add app/\(fullscreen\)/edit/page.tsx
git commit -m "feat: add full-screen /edit page for mobile"
```

---

### Task 10: Create mobile home components

**Files:**
- Create: `components/home/StreakCard.tsx`
- Create: `components/home/QuickActions.tsx`
- Create: `components/home/RecentDrafts.tsx`
- Create: `components/home/MobileHome.tsx`

- [ ] **Step 10a: Create `StreakCard.tsx`**

Uses `lib/streak.ts` utilities. Receives posts data from parent.

```typescript
// components/home/StreakCard.tsx
"use client";

import { useMemo } from "react";
import { buildPostCountMap, getLast7Days, calcStreaks, toLocalDateKey } from "@/lib/streak";
import type { HexoPost } from "@/lib/hexo";

interface StreakCardProps {
  posts: HexoPost[];
}

export default function StreakCard({ posts }: StreakCardProps) {
  const { days, current, longest, totalPosts } = useMemo(() => {
    const countMap = buildPostCountMap(posts);
    const days = getLast7Days(countMap);

    // Build full-year cells for calcStreaks
    const today = new Date();
    const cells = [];
    for (let i = 363; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toLocalDateKey(d);
      cells.push({ date: key, count: countMap.get(key) ?? 0 });
    }
    const streaks = calcStreaks(cells);

    return { days, ...streaks };
  }, [posts]);

  return (
    <div className="p-4 bg-[var(--card)] rounded-2xl border border-[var(--border)]">
      {/* Header: streak number + sub-stats */}
      <div className="flex items-baseline justify-between mb-3.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[28px] font-extrabold text-[var(--foreground)]">{current}</span>
          <span className="text-[13px] font-semibold text-[var(--accent)]">day streak</span>
        </div>
        <div className="flex gap-3 text-[11px] text-[var(--muted-foreground)]">
          <span>Best <span className="font-semibold text-[var(--foreground)]">{longest}d</span></span>
          <span>Year <span className="font-semibold text-[var(--foreground)]">{totalPosts}</span></span>
        </div>
      </div>

      {/* 7-day blocks */}
      <div className="flex gap-1.5">
        {days.map((day) => (
          <div key={day.date} className="flex-1 text-center">
            <div
              className={`h-8 rounded-lg mb-1 flex items-center justify-center ${
                day.isToday && day.count === 0
                  ? "border border-dashed border-[var(--accent)]/35"
                  : ""
              }`}
              style={{
                background: day.isToday && day.count === 0
                  ? "var(--heatmap-0)"
                  : `var(--heatmap-${day.level})`,
              }}
            >
              {day.isToday && day.count === 0 && (
                <span className="text-xs text-[var(--accent)]">?</span>
              )}
            </div>
            <span className={`text-[9px] ${
              day.isToday ? "text-[var(--accent)] font-semibold" : "text-[var(--muted-foreground)]"
            }`}>
              {day.isToday ? "Today" : day.dayLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 10b: Create `QuickActions.tsx`**

```typescript
// components/home/QuickActions.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCommit } from "@/hooks/useCommit";
import { useDeploy } from "@/hooks/useDeploy";
import { useClean } from "@/hooks/useClean";

export default function QuickActions() {
  const { status: commitStatus, handleCommit } = useCommit();
  const { status: deployStatus, logs, handleDeploy } = useDeploy();
  const { status: cleanStatus, handleClean } = useClean();
  const [showDeploySheet, setShowDeploySheet] = useState(false);

  const actions = [
    {
      label: "Commit",
      icon: (/* commit icon SVG */),
      color: "var(--success)",
      bgColor: "rgba(52,199,89,0.12)",
      status: commitStatus,
      onTap: handleCommit,
    },
    {
      label: "Deploy",
      icon: (/* deploy icon SVG */),
      color: "var(--accent)",
      bgColor: "var(--accent-subtle)",
      status: deployStatus,
      onTap: () => { handleDeploy(); setShowDeploySheet(true); },
    },
    {
      label: "Clean",
      icon: (/* clean icon SVG */),
      color: "var(--warning)",
      bgColor: "rgba(255,159,10,0.12)",
      status: cleanStatus,
      onTap: handleClean,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onTap}
            disabled={a.status === "loading" || a.status === "running"}
            className="flex flex-col items-center gap-2 p-3.5 bg-[var(--card)] rounded-[14px] border border-[var(--border)] active:scale-95 transition-transform disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: a.bgColor }}>
              {/* Spinner if loading, icon otherwise */}
              {a.status === "loading" || a.status === "running" ? (
                <svg className="w-[18px] h-[18px] animate-spin" /* spinner */ />
              ) : (
                <svg className="w-[18px] h-[18px]" style={{ color: a.color }} /* icon */ />
              )}
            </div>
            <span className="text-[13px] font-semibold text-[var(--foreground)]">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Deploy bottom sheet */}
      <AnimatePresence>
        {showDeploySheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => deployStatus !== "running" && setShowDeploySheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--card)] rounded-t-2xl border-t border-[var(--border)] max-h-[70vh] flex flex-col"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="text-sm font-semibold text-[var(--foreground)]">Deploy Logs</span>
                <button onClick={() => setShowDeploySheet(false)}
                  disabled={deployStatus === "running"}
                  className="text-[var(--muted-foreground)] disabled:opacity-40">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-[var(--muted-foreground)]">
                {logs.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                {deployStatus === "running" && (
                  <div className="animate-pulse">▌</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

Fill in the actual SVG icons by referencing the mockup at `.superpowers/brainstorm/24836-1773676298/mobile-home-hub.html`.

- [ ] **Step 10c: Create `RecentDrafts.tsx`**

```typescript
// components/home/RecentDrafts.tsx
"use client";

import { useRouter } from "next/navigation";
import type { HexoPost } from "@/lib/hexo";

interface RecentDraftsProps {
  posts: HexoPost[];
}

function formatRelativeTime(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  return `${diffD}d ago`;
}

export default function RecentDrafts({ posts }: RecentDraftsProps) {
  const router = useRouter();

  const drafts = posts
    .filter((p) => p.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  if (drafts.length === 0) return null;

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      {drafts.map((post, i) => (
        <button
          key={post.filepath}
          onClick={() => router.push(`/edit?path=${encodeURIComponent(post.filepath)}`)}
          className="w-full flex items-center justify-between px-4 py-3 active:bg-[var(--muted)] transition-colors"
        >
          <div className="text-left min-w-0">
            <div className="text-[14px] font-medium text-[var(--foreground)] truncate">{post.title}</div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Draft · {formatRelativeTime(post.date)}
            </div>
          </div>
          <svg className="w-4 h-4 text-[var(--muted-foreground)] shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6" />
          </svg>
        </button>
      ))}
    </div>
  );
}
```

Note: Add a separator between items. Either use `border-b` on all but last, or a `divide-y` wrapper.

- [ ] **Step 10d: Create `MobileHome.tsx`**

Combines all mobile home components:

```typescript
// components/home/MobileHome.tsx
"use client";

import { useRouter } from "next/navigation";
import StreakCard from "@/components/home/StreakCard";
import QuickActions from "@/components/home/QuickActions";
import RecentDrafts from "@/components/home/RecentDrafts";
import type { HexoPost } from "@/lib/hexo";

interface MobileHomeProps {
  posts: HexoPost[];
}

export default function MobileHome({ posts }: MobileHomeProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      {/* 7-Day Streak */}
      <StreakCard posts={posts} />

      {/* AI Write CTA */}
      <button
        onClick={() => router.push("/write")}
        className="flex items-center gap-3.5 p-[18px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] rounded-2xl active:scale-[0.98] transition-transform"
      >
        <div className="w-11 h-11 rounded-[13px] bg-white/20 flex items-center justify-center shrink-0">
          <svg className="w-[22px] h-[22px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div className="flex-1 text-left">
          <div className="text-[16px] font-bold text-white">AI로 새 글 쓰기</div>
          <div className="text-[12px] text-white/70 mt-0.5">소스 URL을 넣으면 블로그 포스트를 생성합니다</div>
        </div>
        <svg className="w-5 h-5 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Quick Actions */}
      <div>
        <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2 px-0.5">
          Quick Actions
        </div>
        <QuickActions />
      </div>

      {/* Recent Drafts */}
      <div>
        <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2 px-0.5">
          Recent Drafts
        </div>
        <RecentDrafts posts={posts} />
      </div>
    </div>
  );
}
```

- [ ] **Step 10e: Commit**

```bash
git add components/home/StreakCard.tsx components/home/QuickActions.tsx \
  components/home/RecentDrafts.tsx components/home/MobileHome.tsx
git commit -m "feat: add mobile home components (streak, quick actions, recent drafts)"
```

---

### Task 11: Update home page for dual rendering

**Files:**
- Modify: `app/(dashboard)/page.tsx`

- [ ] **Step 11a: Import MobileHome and wrap existing desktop content**

In `app/(dashboard)/page.tsx`:

1. Import `MobileHome` component
2. Wrap the existing desktop content in a `<div className="hidden md:block">` wrapper
3. Add `<div className="md:hidden"><MobileHome posts={data.posts} /></div>` before or after the desktop content

The server component fetches data once and passes to both views. Both render in HTML but CSS hides one based on viewport.

**Important:** The existing page has early-return branches for `!data.configured` and `!data.valid` states. These must render for BOTH mobile and desktop, so they stay above the mobile/desktop split:

```typescript
// In the return JSX of app/(dashboard)/page.tsx:

// Error states render for both viewports (keep existing logic)
if (!data.configured) return (/* existing setup prompt UI */);
if (!data.valid) return (/* existing invalid path UI */);

return (
  <>
    {/* Mobile view */}
    <div className="md:hidden">
      <MobileHome posts={data.posts} />
    </div>

    {/* Desktop view — existing content */}
    <div className="hidden md:block">
      {/* ...all existing desktop home JSX... */}
    </div>
  </>
);
```

Also:
- Hide `HomeNewPostButton` on mobile: add `hidden md:flex` to its container
- The DashboardLayout mobile header will show "Overview" which is fine — `MobileHome` does not render its own header since the layout already provides one

- [ ] **Step 11b: Test both views**

- Desktop (> 768px): Should look identical to current
- Mobile (< 768px): Should show the quick action hub

Run: `npm run build`. Test on both viewports.

- [ ] **Step 11c: Commit**

```bash
git add app/\(dashboard\)/page.tsx
git commit -m "feat: render mobile quick action hub on home page"
```

---

### Task 12: Update PostCard and PostList for mobile branching

**Files:**
- Modify: `components/posts/PostCard.tsx`
- Modify: `components/posts/PostList.tsx`

- [ ] **Step 12a: Update PostCard**

In `PostCard.tsx`:
1. Import `useIsMobile` from `hooks/useMediaQuery`
2. Import `useRouter` from `next/navigation`
3. When `isMobile` is true, clicking the card navigates to `/edit?path=...` instead of opening `EditModal`

```typescript
const isMobile = useIsMobile();
const router = useRouter();

// In the card's onClick handler:
const handleCardClick = () => {
  if (isMobile) {
    router.push(`/edit?path=${encodeURIComponent(post.filepath)}`);
  } else {
    setEditModalOpen(true);
  }
};
```

The EditModal still renders (for desktop), but on mobile it won't open.

- [ ] **Step 12b: Update PostList**

In `PostList.tsx`:
1. Import `useIsMobile`
2. Import `useRouter`
3. When "New Post" button is clicked on mobile, navigate to `/write` instead of opening `NewPostModal`

```typescript
const isMobile = useIsMobile();
const router = useRouter();

// In the New Post button onClick:
const handleNewPost = () => {
  if (isMobile) {
    router.push("/write");
  } else {
    setNewPostModalOpen(true);
  }
};
```

- [ ] **Step 12c: Test mobile branching**

On mobile viewport:
- Tap a post card → navigates to `/edit?path=...`
- Tap "New Post" → navigates to `/write`

On desktop viewport:
- Click a post card → opens EditModal (unchanged)
- Click "New Post" → opens NewPostModal (unchanged)

- [ ] **Step 12d: Commit**

```bash
git add components/posts/PostCard.tsx components/posts/PostList.tsx
git commit -m "feat: mobile branching — PostCard and PostList navigate to fullscreen pages"
```

---

## Chunk 4: Polish and Verification

### Task 13: End-to-end verification

- [ ] **Step 13a: Build check**

```bash
npm run build
```

Fix any TypeScript or build errors.

- [ ] **Step 13b: Mobile flow test**

Test the complete mobile flow on a 375px viewport (or actual phone):

1. Home → see streak card, AI Write CTA, quick actions, recent drafts
2. Tap "AI로 새 글 쓰기" → navigates to /write
3. Fill in source URL → tap Create Post → navigates to /edit
4. Edit content → Save → success
5. Back → returns to home or posts
6. Tap a draft in Recent Drafts → opens /edit
7. Tap Commit → executes, shows toast
8. Tap Deploy → bottom sheet with logs
9. Tap Clean → executes, shows toast

- [ ] **Step 13c: Desktop regression test**

Test that nothing changed on desktop:

1. Home → existing layout with stats, heatmap, chart
2. Posts → existing list with modals
3. New Post → opens NewPostModal
4. Edit post → opens EditModal
5. Commit/Deploy/Clean buttons → work as before

- [ ] **Step 13d: Final commit**

```bash
git add -A
git commit -m "feat: mobile quick action hub — complete implementation"
```
