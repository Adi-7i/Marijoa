"use client";

import { useEffect, useState } from "react";

export type ToastVariant = "info" | "success" | "error";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

type Listener = (toasts: Toast[]) => void;

let counter = 0;
let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

export function showToast(
  message: string,
  options: { variant?: ToastVariant; duration?: number } = {}
): number {
  const id = ++counter;
  const toast: Toast = {
    id,
    message,
    variant: options.variant ?? "info",
    duration: options.duration ?? 4000,
  };
  toasts = [...toasts, toast];
  emit();
  if (toast.duration > 0) {
    setTimeout(() => dismissToast(id), toast.duration);
  }
  return id;
}

export function dismissToast(id: number) {
  const before = toasts.length;
  toasts = toasts.filter((t) => t.id !== id);
  if (toasts.length !== before) emit();
}

export function clearToasts() {
  if (!toasts.length) return;
  toasts = [];
  emit();
}

export function useToasts(): Toast[] {
  const [state, setState] = useState<Toast[]>(toasts);
  useEffect(() => {
    const listener: Listener = (next) => setState(next);
    listeners.add(listener);
    setState(toasts);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return state;
}

