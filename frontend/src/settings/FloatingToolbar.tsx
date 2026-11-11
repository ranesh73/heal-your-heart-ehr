import React, { useState } from "react";
import { Gift, Plug, HelpCircle, Keyboard } from "lucide-react";
import { ReferFriendModal } from "./ReferFriendModal";
import { AddonsModal } from "./AddonsModal";
import { HelpModal } from "./HelpModal";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";

export function FloatingToolbar({
  shortcutsOpen,
  onToggleShortcuts,
}: {
  shortcutsOpen?: boolean;
  onToggleShortcuts?: (open: boolean) => void;
}) {
  const [referOpen, setReferOpen] = useState(false);
  const [addonsOpen, setAddonsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [localShortcutsOpen, setLocalShortcutsOpen] = useState(false);

  const isShortcutsOpen =
    shortcutsOpen !== undefined ? shortcutsOpen : localShortcutsOpen;
  const setIsShortcutsOpen = (open: boolean) => {
    if (onToggleShortcuts) onToggleShortcuts(open);
    else setLocalShortcutsOpen(open);
  };

  return (
    <>
      <aside
        className="charm-floating-vertical-toolbar"
        aria-label="Charm Floating Utilities"
      >
        {/* ICON 1: REFER A FRIEND */}
        <div className="charm-rail-btn-wrapper">
          <button
            type="button"
            className="charm-rail-btn refer-friend-btn"
            onClick={() => setReferOpen(true)}
            aria-label="Refer a Friend"
          >
            <div className="charm-gift-icon-container">
              <Gift size={18} className="charm-gift-icon" />
            </div>
          </button>
          <span className="charm-rail-tooltip" role="tooltip">
            Refer a Friend
          </span>
        </div>

        {/* ICON 2: ADD-ONS */}
        <div className="charm-rail-btn-wrapper">
          <button
            type="button"
            className="charm-rail-btn addons-btn"
            onClick={() => setAddonsOpen(true)}
            aria-label="Add-ons"
          >
            <Plug size={17} className="text-slate-800" />
          </button>
          <span className="charm-rail-tooltip" role="tooltip">
            Add-ons
          </span>
        </div>

        {/* ICON 3: HELP */}
        <div className="charm-rail-btn-wrapper">
          <button
            type="button"
            className="charm-rail-btn help-btn"
            onClick={() => setHelpOpen(true)}
            aria-label="Help"
          >
            <HelpCircle size={17} className="text-slate-800" />
          </button>
          <span className="charm-rail-tooltip" role="tooltip">
            Help
          </span>
        </div>

        {/* ICON 4: KEYBOARD SHORTCUTS */}
        <div className="charm-rail-btn-wrapper">
          <button
            type="button"
            className="charm-rail-btn shortcuts-btn"
            onClick={() => setIsShortcutsOpen(true)}
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard size={17} className="text-slate-800" />
          </button>
          <span className="charm-rail-tooltip" role="tooltip">
            Keyboard Shortcuts
          </span>
        </div>
      </aside>

      {/* Modals */}
      <ReferFriendModal open={referOpen} onClose={() => setReferOpen(false)} />
      <AddonsModal open={addonsOpen} onClose={() => setAddonsOpen(false)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <KeyboardShortcutsModal
        open={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </>
  );
}
