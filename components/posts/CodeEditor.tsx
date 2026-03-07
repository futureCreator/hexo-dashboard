"use client";

import { forwardRef, useImperativeHandle, useRef, useMemo } from "react";
import ReactCodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { tags as t } from "@lezer/highlight";

// ─── Light theme ────────────────────────────────────────────────────────────
const lightTheme = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "transparent" },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      fontFamily:
        "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
      fontSize: "13px",
      lineHeight: "1.75",
      overflow: "auto",
    },
    ".cm-content": { padding: "20px 20px 20px 0", minHeight: "100%" },
    ".cm-gutters": {
      backgroundColor: "#FFFFFF",
      borderRight: "1px solid #E2E8F0",
      color: "#94A3B8",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 14px 0 10px",
      fontSize: "12px",
      minWidth: "48px",
    },
    ".cm-activeLine": { backgroundColor: "rgba(0,82,255,0.025)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(0,82,255,0.04)" },
    ".cm-selectionBackground": {
      backgroundColor: "rgba(0,82,255,0.15) !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(0,82,255,0.15) !important",
    },
    ".cm-cursor": { borderLeftColor: "#0052FF", borderLeftWidth: "2px" },
    ".cm-line": { padding: "0 4px" },
  },
  { dark: false }
);

// ─── Dark theme ──────────────────────────────────────────────────────────────
const darkTheme = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "transparent" },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      fontFamily:
        "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
      fontSize: "13px",
      lineHeight: "1.75",
      overflow: "auto",
    },
    ".cm-content": { padding: "20px 20px 20px 0", minHeight: "100%" },
    ".cm-gutters": {
      backgroundColor: "#0a0a0c",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      color: "#8A8F98",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 14px 0 10px",
      fontSize: "12px",
      minWidth: "48px",
    },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.025)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(255,255,255,0.04)" },
    ".cm-selectionBackground": {
      backgroundColor: "rgba(94,106,210,0.3) !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(94,106,210,0.3) !important",
    },
    ".cm-cursor": { borderLeftColor: "#5E6AD2", borderLeftWidth: "2px" },
    ".cm-line": { padding: "0 4px" },
  },
  { dark: true }
);

// ─── Syntax highlight: light ─────────────────────────────────────────────────
const lightHighlight = HighlightStyle.define([
  { tag: t.heading1, fontWeight: "700", fontSize: "1.15em", color: "#0F172A" },
  { tag: t.heading2, fontWeight: "700", fontSize: "1.05em", color: "#1E293B" },
  {
    tag: [t.heading3, t.heading4, t.heading5, t.heading6],
    fontWeight: "600",
    color: "#334155",
  },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "700" },
  { tag: [t.link, t.url], color: "#0052FF" },
  {
    tag: t.monospace,
    fontFamily:
      "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
    backgroundColor: "rgba(0,82,255,0.07)",
    padding: "0.1em 0.3em",
    borderRadius: "3px",
    color: "#1e3a8a",
  },
  { tag: t.strikethrough, textDecoration: "line-through", color: "#94A3B8" },
  { tag: t.quote, color: "#64748B", fontStyle: "italic" },
  { tag: t.meta, color: "#64748B" },
  { tag: t.comment, color: "#94A3B8", fontStyle: "italic" },
  { tag: t.keyword, color: "#7C3AED", fontWeight: "600" },
  { tag: t.atom, color: "#059669" },
  { tag: t.number, color: "#059669" },
  { tag: t.string, color: "#0F172A" },
  { tag: t.punctuation, color: "#94A3B8" },
  { tag: t.processingInstruction, color: "#64748B" },
  { tag: t.contentSeparator, color: "#CBD5E1" },
]);

// ─── Syntax highlight: dark ──────────────────────────────────────────────────
const darkHighlight = HighlightStyle.define([
  { tag: t.heading1, fontWeight: "700", fontSize: "1.15em", color: "#EDEDEF" },
  { tag: t.heading2, fontWeight: "700", fontSize: "1.05em", color: "#D4D4D8" },
  {
    tag: [t.heading3, t.heading4, t.heading5, t.heading6],
    fontWeight: "600",
    color: "#A1A1AA",
  },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "700" },
  { tag: [t.link, t.url], color: "#7B8ED9" },
  {
    tag: t.monospace,
    fontFamily:
      "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
    backgroundColor: "rgba(94,106,210,0.14)",
    padding: "0.1em 0.3em",
    borderRadius: "3px",
    color: "#C7D2FE",
  },
  { tag: t.strikethrough, textDecoration: "line-through", color: "#8A8F98" },
  { tag: t.quote, color: "#8A8F98", fontStyle: "italic" },
  { tag: t.meta, color: "#8A8F98" },
  { tag: t.comment, color: "#8A8F98", fontStyle: "italic" },
  { tag: t.keyword, color: "#A78BFA", fontWeight: "600" },
  { tag: t.atom, color: "#34D399" },
  { tag: t.number, color: "#34D399" },
  { tag: t.string, color: "#EDEDEF" },
  { tag: t.punctuation, color: "#8A8F98" },
  { tag: t.processingInstruction, color: "#8A8F98" },
  { tag: t.contentSeparator, color: "#3F3F46" },
]);

// ─── Public types ─────────────────────────────────────────────────────────────
export interface CodeEditorHandle {
  view: EditorView | null;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
  onViewMount?: (view: EditorView) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  ({ value, onChange, isDark, onViewMount }, ref) => {
    const cmRef = useRef<ReactCodeMirrorRef>(null);

    useImperativeHandle(ref, () => ({
      get view() {
        return cmRef.current?.view ?? null;
      },
    }));

    const extensions = useMemo(
      () => [
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        syntaxHighlighting(isDark ? darkHighlight : lightHighlight),
        EditorView.lineWrapping,
      ],
      [isDark]
    );

    return (
      <ReactCodeMirror
        ref={cmRef}
        value={value}
        onChange={onChange}
        className="h-full"
        height="100%"
        theme={isDark ? darkTheme : lightTheme}
        extensions={extensions}
        onCreateEditor={(view) => onViewMount?.(view)}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: false,
          drawSelection: true,
          dropCursor: false,
          allowMultipleSelections: true,
          indentOnInput: false,
          syntaxHighlighting: true,
          bracketMatching: false,
          closeBrackets: false,
          autocompletion: false,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: false,
          closeBracketsKeymap: false,
          defaultKeymap: true,
          searchKeymap: false,
          historyKeymap: true,
          foldKeymap: false,
          completionKeymap: false,
          lintKeymap: false,
          tabSize: 2,
        }}
      />
    );
  }
);

CodeEditor.displayName = "CodeEditor";
export default CodeEditor;
