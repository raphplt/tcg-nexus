import { create } from "zustand";

type ToastVariant = "error" | "success" | "info";

interface ToastState {
  duration: number;
  id: number;
  message: string;
  variant: ToastVariant;
  visible: boolean;
  hideToast: () => void;
  showError: (message: string) => void;
  showToast: (
    message: string,
    variant?: ToastVariant,
    duration?: number,
  ) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  duration: 4000,
  id: 0,
  message: "",
  variant: "info",
  visible: false,
  hideToast: () => set({ visible: false }),
  showError: (message) =>
    set({
      duration: 4000,
      id: Date.now(),
      message,
      variant: "error",
      visible: true,
    }),
  showToast: (message, variant = "info", duration = 4000) =>
    set({
      duration,
      id: Date.now(),
      message,
      variant,
      visible: true,
    }),
}));

export const toast = {
  hide: () => useToastStore.getState().hideToast(),
  showError: (message: string) => useToastStore.getState().showError(message),
  showInfo: (message: string) =>
    useToastStore.getState().showToast(message, "info"),
  showSuccess: (message: string) =>
    useToastStore.getState().showToast(message, "success"),
};
