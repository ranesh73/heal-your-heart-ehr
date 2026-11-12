import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Keyboard, X, Command, Sparkles } from "lucide-react";

export function KeyboardShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const shortcutGroups = [
    {
      group: "Primary Global Shortcuts",
      items: [
        {
          keys: ["Shift", "K"],
          action: "Open Keyboard Shortcuts Dialog",
          note: "Global across the entire EHR",
          highlight: true,
        },
        {
          keys: ["Esc"],
          action: "Close active modal, drawer, or flyout",
          note: "Dismisses topmost overlay",
        },
        {
          keys: ["/"],
          action: "Focus global patient search input",
          note: "When not in another text box",
        },
      ],
    },
    {
      group: "Module Navigation",
      items: [
        {
          keys: ["Alt", "H"],
          action: "Navigate to Home Dashboard",
          note: "Heal Your Heart launcher",
        },
        {
          keys: ["Alt", "P"],
          action: "Navigate to Patients Directory",
          note: "Browse all patient charts",
        },
        {
          keys: ["Alt", "C"],
          action: "Navigate to Chart Notes / Consultations",
          note: "Clinical SOAP encounters",
        },
        {
          keys: ["Alt", "S"],
          action: "Open Settings Dashboard",
          note: "Heal Your Heart settings replica",
        },
        {
          keys: ["Alt", "E"],
          action: "Navigate to EECP Workspace",
          note: "Bed management & daily sessions",
        },
        {
          keys: ["Alt", "B"],
          action: "Navigate to Billing & Ledger",
          note: "Invoices, packages & receipts",
        },
        {
          keys: ["Alt", "L"],
          action: "Navigate to Diagnostic Labs",
          note: "Order review & lab tracking",
        },
      ],
    },
    {
      group: "Fast Clinical Actions",
      items: [
        {
          keys: ["Shift", "N"],
          action: "Quick Patient Registration",
          note: "Opens intake registration dialog",
        },
        {
          keys: ["Shift", "A"],
          action: "Schedule New Appointment",
          note: "Opens appointment booking dialog",
        },
      ],
    },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={(val) => !val && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className="modal shortcuts-dialog"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="modal-head">
            <div className="flex items-center gap-2">
              <div className="charm-shortcut-icon-pill">
                <Keyboard size={18} className="text-slate-800" />
              </div>
              <div>
                <Dialog.Title>Keyboard Shortcuts</Dialog.Title>
                <Dialog.Description>
                  Use keyboard shortcuts to navigate Heal Your Heart EHR faster.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="button ghost" aria-label="Close">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="shortcuts-modal-body">
            {/* Featured Shift + K Badge Card */}
            <div className="shortcut-featured-card">
              <div className="shortcut-featured-badge">
                <kbd className="charm-kbd-large">Shift</kbd>
                <span className="text-slate-400 font-bold">+</span>
                <kbd className="charm-kbd-large">K</kbd>
              </div>
              <div className="shortcut-featured-text">
                <strong>Open Keyboard Shortcuts</strong>
                <p>
                  Press <kbd className="charm-kbd-mini">Shift + K</kbd> anywhere in the application to summon this shortcut directory instantly.
                </p>
              </div>
            </div>

            {/* List of shortcuts grouped */}
            <div className="shortcuts-groups-list">
              {shortcutGroups.map((grp, gIdx) => (
                <div key={gIdx} className="shortcut-group-block">
                  <h4 className="shortcut-group-title">{grp.group}</h4>
                  <div className="shortcut-table">
                    {grp.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`shortcut-row ${item.highlight ? "highlight" : ""}`}
                      >
                        <div className="shortcut-keys-col">
                          {item.keys.map((k, kIdx) => (
                            <React.Fragment key={kIdx}>
                              <kbd className="charm-kbd">{k}</kbd>
                              {kIdx < item.keys.length - 1 && (
                                <span className="kbd-plus">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                        <div className="shortcut-desc-col">
                          <span className="shortcut-action">{item.action}</span>
                          <span className="shortcut-note">{item.note}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer flex justify-between items-center">
            <span className="text-xs text-muted">
              Press <kbd className="charm-kbd-mini">Esc</kbd> anytime to close
            </span>
            <button type="button" className="button secondary" onClick={onClose}>
              Got It
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
