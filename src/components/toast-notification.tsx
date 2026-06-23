"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <Check size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertCircle size={18} />,
};

const toastColors: Record<ToastType, { bg: string; text: string; icon: string }> = {
  success: {
    bg: "rgba(16, 185, 129, 0.15)",
    text: "#10b981",
    icon: "#10b981",
  },
  error: {
    bg: "rgba(239, 68, 68, 0.15)",
    text: "#ef4444",
    icon: "#ef4444",
  },
  info: {
    bg: "rgba(59, 130, 246, 0.15)",
    text: "#3b82f6",
    icon: "#3b82f6",
  },
  warning: {
    bg: "rgba(251, 146, 60, 0.15)",
    text: "#fb923c",
    icon: "#fb923c",
  },
};

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 md:bottom-6">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const colors = toastColors[toast.type];
  const duration = toast.duration || 3000;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onRemove, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg backdrop-blur-md"
      style={{
        backgroundColor: colors.bg,
        borderLeft: `3px solid ${colors.text}`,
      }}
    >
      <div style={{ color: colors.icon, flexShrink: 0 }}>
        {toastIcons[toast.type]}
      </div>
      <p className="text-sm font-medium" style={{ color: colors.text }}>
        {toast.message}
      </p>
      <button
        onClick={onRemove}
        className="ml-2 flex-shrink-0 rounded-md p-0.5 transition-colors hover:opacity-70"
        style={{ color: colors.text }}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

/**
 * Hook for managing toasts
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = "info", duration?: number) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    addToast,
    removeToast,
    success: (message: string, duration?: number) => addToast(message, "success", duration),
    error: (message: string, duration?: number) => addToast(message, "error", duration),
    info: (message: string, duration?: number) => addToast(message, "info", duration),
    warning: (message: string, duration?: number) => addToast(message, "warning", duration),
  };
}
