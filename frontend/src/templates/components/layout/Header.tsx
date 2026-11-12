import React, { useState, useRef, useEffect } from 'react';
import { Building2, User, LogOut, ChevronDown, Check, Shield } from 'lucide-react';
import { UserSession } from '../../types';

interface HeaderProps {
  currentUser: UserSession | null;
  onLogout: () => void;
  onNavigateHome: () => void;
  selectedBranch: string;
  onSelectBranch: (branch: string) => void;
}

/**
 * The clinic's five real locations, with the branch code the practice uses.
 * This list is the whole of it: no provider entries and no partner brands
 * appear in the location switcher, because those are not places a user can
 * switch into.
 */
const CLINIC_BRANCHES: Array<{ name: string; code: string }> = [
  { name: 'Heal Your Heart Neelankarai', code: 'HUH001' },
  { name: 'Heal Your Heart Royapettah', code: 'HUH002' },
  { name: 'Heal Your Heart - Manapakkam', code: 'HUH003' },
  { name: 'Heal Your Heart-Madurai', code: '005' },
  { name: 'Heal Your Heart-Tirunelveli', code: '004' }
];

const DEFAULT_USER_NAME = 'Sanjana K';

/** First letter of the given name, for the avatar disc. */
function avatarInitial(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'U';
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onNavigateHome,
  selectedBranch,
  onSelectBranch
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setShowBranchMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // The account holder is shown by plain name only - no title, qualification
  // or specialty, and never prefixed with "Dr.".
  const userName = currentUser?.full_name?.trim() || DEFAULT_USER_NAME;
  const userEmail = currentUser?.email || '';

  const activeBranch =
    CLINIC_BRANCHES.find((b) => b.name === selectedBranch) || CLINIC_BRANCHES[0];

  return (
    <header className="charm-header">
      <div className="header-left">
        <div
          className="brand-logo-wrap"
          onClick={onNavigateHome}
          title="charmhealth - Template Management"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <img
            src="/charm_logo.jpg"
            alt="charmhealth"
            style={{
              height: '32px',
              maxWidth: '160px',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
        <span className="demo-pill" title="Heal Your Heart Clinical Prototype">
          Demo Prototype
        </span>
      </div>

      {/* Two controls only - location and account. Nothing sits between them,
          so removing the former consultation button and alert bell leaves no
          gap to fill. */}
      <div className="header-right">
        <div style={{ position: 'relative' }} ref={branchRef}>
          <button
            type="button"
            className="clinic-branch-badge"
            onClick={() => setShowBranchMenu((v) => !v)}
            title="Switch practice location"
            aria-haspopup="menu"
            aria-expanded={showBranchMenu}
          >
            <Building2 size={16} color="#374151" aria-hidden="true" />
            <span className="branch-badge-label">{activeBranch.name}</span>
            <span className="branch-badge-code">{activeBranch.code}</span>
            <ChevronDown size={13} color="#6b7280" aria-hidden="true" />
          </button>

          {showBranchMenu && (
            <div
              className="three-dot-menu-popover"
              role="menu"
              style={{ width: '330px', right: 0, top: '38px', zIndex: 100 }}
            >
              <div style={{ padding: '8px 14px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                  Heal Your Heart Locations
                </div>
              </div>
              {CLINIC_BRANCHES.map((branch) => {
                const isActive = branch.name === activeBranch.name;
                return (
                  <button
                    key={branch.code}
                    type="button"
                    role="menuitem"
                    className="menu-item branch-menu-item"
                    onClick={() => {
                      onSelectBranch(branch.name);
                      setShowBranchMenu(false);
                    }}
                  >
                    <Building2 size={14} color="#6b7280" aria-hidden="true" />
                    <span className="branch-menu-name" style={{ fontWeight: isActive ? 600 : 400 }}>
                      {branch.name}
                    </span>
                    <span className="branch-menu-code">{branch.code}</span>
                    {isActive && <Check size={14} color="#0288d1" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            type="button"
            className="user-profile-badge"
            onClick={() => setShowProfileMenu((v) => !v)}
            title="Account"
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
          >
            <span
              className="user-avatar"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#692976',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px'
              }}
            >
              {avatarInitial(userName)}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{userName}</span>
            <ChevronDown size={13} color="#6b7280" aria-hidden="true" />
          </button>

          {showProfileMenu && (
            <div
              className="three-dot-menu-popover"
              role="menu"
              style={{ width: '240px', right: 0, top: '40px', zIndex: 100 }}
            >
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>{userName}</div>
                {userEmail && (
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{userEmail}</div>
                )}
              </div>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigateHome();
                }}
              >
                <User size={14} color="#4b5563" aria-hidden="true" /> Profile
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigateHome();
                }}
              >
                <Shield size={14} color="#4b5563" aria-hidden="true" /> Template Dashboard
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                style={{ color: '#dc2626' }}
              >
                <LogOut size={14} color="#dc2626" aria-hidden="true" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
