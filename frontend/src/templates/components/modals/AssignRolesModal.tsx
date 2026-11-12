import React, { useState, useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { ClinicalTemplate } from '../../types';

interface AssignRolesModalProps {
  isOpen: boolean;
  template: ClinicalTemplate | null;
  onClose: () => void;
  onSaveRoles: (templateId: number, roles: string[]) => void;
}

const ALL_ROLES = [
  'Administrator',
  'Physician',
  'Physician Assistant',
  'Nurse',
  'Clinical Staff'
];

export const AssignRolesModal: React.FC<AssignRolesModalProps> = ({
  isOpen,
  template,
  onClose,
  onSaveRoles
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (template) {
      if (template.roles_list && template.roles_list.length > 0) {
        setSelectedRoles(template.roles_list);
      } else if (template.roles && template.roles.length > 0) {
        setSelectedRoles(template.roles);
      } else if (template.accessible_to && template.accessible_to !== 'All Roles') {
        setSelectedRoles(template.accessible_to.split(',').map((r) => r.trim()));
      } else {
        setSelectedRoles(ALL_ROLES);
      }
    }
  }, [template]);

  if (!isOpen || !template) return null;

  const handleToggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSave = () => {
    onSaveRoles(template.id, selectedRoles.length === 0 ? ['Physician'] : selectedRoles);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#0288d1" />
            <h3 className="modal-title">Assign Template Access</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '14px' }}>
            Configure clinical role permissions for <strong>{template.name}</strong>:
          </p>

          <div className="role-check-list">
            {ALL_ROLES.map((role) => {
              const checked = selectedRoles.includes(role);
              return (
                <label key={role} className="role-check-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleRole(role)}
                  />
                  <span>{role}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
