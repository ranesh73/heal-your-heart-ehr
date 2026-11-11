import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Gift, Copy, Check, Share2, X, Sparkles, MessageCircle, Mail } from "lucide-react";
import { useApp } from "../context";

export function ReferFriendModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, notify } = useApp();
  const [copied, setCopied] = useState(false);
  const referralCode = `DR-${(user?.name || "ANANYA").replace(/[^a-zA-Z]/g, "").slice(0, 6).toUpperCase()}-2026`;
  const referralLink = `https://ehr.healyourheart.in/invite?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralLink);
      }
      setCopied(true);
      notify("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      notify("Copied referral link: " + referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join me on Heal Your Heart EHR — the cardiology and EECP practice management platform: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent("Invitation to join Heal Your Heart EHR");
    const body = encodeURIComponent(
      `Hello Colleague,\n\nI recommend using Heal Your Heart EHR for comprehensive non-invasive cardiology and EECP practice management.\n\nExplore the platform here: ${referralLink}\n\nWarm regards,\n${user?.name || "Dr. Ananya"}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <Dialog.Root open={open} onOpenChange={(val) => !val && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal refer-friend-dialog" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="modal-head">
            <div className="flex items-center gap-2">
              <div className="charm-refer-gift-pill">
                <Gift size={18} className="text-amber-500" />
              </div>
              <div>
                <Dialog.Title>Refer a Friend</Dialog.Title>
                <Dialog.Description>
                  Share Heal Your Heart EHR with colleagues & medical specialists
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="button ghost" aria-label="Close">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="refer-friend-body">
            {/* Friendly Promotional Banner */}
            <div className="refer-promo-card">
              <div className="refer-promo-icon-wrap">
                <Sparkles size={28} className="refer-sparkle-icon" />
              </div>
              <div className="refer-promo-content">
                <h3>Invite Healthcare Colleagues</h3>
                <p>
                  Invite your friends to experience Heal Your Heart EHR. Share our platform and help more healthcare professionals improve their practice management.
                </p>
              </div>
            </div>

            {/* Referral Link Box */}
            <div className="refer-link-section">
              <label className="refer-link-label">Your Personal Referral Link</label>
              <div className="refer-link-box">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="refer-link-input"
                  aria-label="Referral link"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`refer-copy-btn ${copied ? "copied" : ""}`}
                >
                  {copied ? (
                    <>
                      <Check size={14} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
              <small className="refer-link-hint">
                Referral Code: <strong>{referralCode}</strong> · Valid for clinical trial registrations
              </small>
            </div>

            {/* Share Options */}
            <div className="refer-share-row">
              <span className="refer-share-title">Quick Share:</span>
              <button
                type="button"
                className="refer-share-btn whatsapp"
                onClick={handleShareWhatsApp}
              >
                <MessageCircle size={15} />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                className="refer-share-btn email"
                onClick={handleShareEmail}
              >
                <Mail size={15} />
                <span>Email</span>
              </button>
              <button
                type="button"
                className="refer-share-btn generic"
                onClick={handleCopy}
              >
                <Share2 size={15} />
                <span>Copy Message</span>
              </button>
            </div>
          </div>

          <div className="modal-footer flex justify-between items-center">
            <span className="text-xs text-muted">
              Heal Your Heart EHR Referral Partner Program
            </span>
            <button type="button" className="button secondary" onClick={onClose}>
              Done
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
