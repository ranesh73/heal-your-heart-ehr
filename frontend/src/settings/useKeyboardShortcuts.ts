import { useEffect } from "react";
import { navigate } from "../api";

export function useKeyboardShortcuts({
  onOpenShortcuts,
  onCloseModals,
}: {
  onOpenShortcuts: () => void;
  onCloseModals?: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Determine if the user is typing inside an editable field
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      // Handle Shift + K: Open Keyboard Shortcuts modal
      // Works even if caps lock is on or off
      if (e.shiftKey && (e.key === "K" || e.key === "k" || e.code === "KeyK")) {
        // If typing in input, DO NOT trigger
        if (isInput) return;

        e.preventDefault();
        e.stopPropagation();
        onOpenShortcuts();
        return;
      }

      // Handle Escape: Close modals
      if (e.key === "Escape") {
        if (onCloseModals) {
          onCloseModals();
        }
        return;
      }

      // If user is typing in input, ignore navigation shortcuts
      if (isInput) return;

      // Handle quick Alt key navigation shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "h") {
          e.preventDefault();
          navigate("/home");
        } else if (key === "p") {
          e.preventDefault();
          navigate("/patients");
        } else if (key === "c") {
          e.preventDefault();
          navigate("/clinical");
        } else if (key === "s") {
          e.preventDefault();
          navigate("/settings");
        } else if (key === "b") {
          e.preventDefault();
          navigate("/billing");
        } else if (key === "e") {
          e.preventDefault();
          navigate("/eecp");
        } else if (key === "l") {
          e.preventDefault();
          navigate("/labs");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [onOpenShortcuts, onCloseModals]);
}
