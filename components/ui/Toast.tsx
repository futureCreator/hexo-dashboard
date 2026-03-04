"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (opts: { type: ToastType; message: string }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const easeOut = [0.16, 1, 0.3, 1] as const;

const TOAST_GAP = 12;
const TOAST_OFFSET_BASE = 16;
const TOAST_HEIGHT = 64;

const toastStyles = {
  success: {
    container: "bg-emerald-50 border-emerald-200",
    icon: "bg-emerald-500",
    text: "text-emerald-800",
  },
  error: {
    container: "bg-red-50 border-red-200",
    icon: "bg-red-500",
    text: "text-red-800",
  },
  info: {
    container: "bg-blue-50 border-blue-200",
    icon: "bg-blue-500",
    text: "text-blue-800",
  },
} as const;

const icons = {
  success: (
    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

function ToastItem({
  toast,
  index,
  onDismiss,
}: {
  toast: Toast;
  index: number;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const style = toastStyles[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0, bottom: TOAST_OFFSET_BASE + index * (TOAST_HEIGHT + TOAST_GAP) }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: easeOut }}
      style={{
        position: "fixed",
        right: 16,
        bottom: TOAST_OFFSET_BASE + index * (TOAST_HEIGHT + TOAST_GAP),
        zIndex: 50,
      }}
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg w-72 pointer-events-auto ${style.container}`}
    >
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${style.icon}`}>
        {icons[toast.type]}
      </div>
      <p className={`text-sm flex-1 leading-snug ${style.text}`}>
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className={`shrink-0 opacity-50 hover:opacity-100 transition-opacity cursor-pointer ${style.text}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, message }: { type: ToastType; message: string }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, message }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {toasts.map((toast, index) => (
              <ToastItem
                key={toast.id}
                toast={toast}
                index={index}
                onDismiss={dismiss}
              />
            ))}
          </AnimatePresence>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
