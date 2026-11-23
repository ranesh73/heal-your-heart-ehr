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
  // As requested in Priority 9: Remove the four right-side floating icons
  // (Gift, Plug, Help, Keyboard) from the visible application UI and print preview.
  return null;
}
