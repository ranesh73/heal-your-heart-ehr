import React from 'react';
import { ArrowLeft, Edit2, Info, MapPin, Phone } from 'lucide-react';
import { ClinicalTemplate } from '../../types';

interface ViewEmailTemplateViewProps {
  template: ClinicalTemplate;
  onBack: () => void;
  onEdit?: (template: ClinicalTemplate) => void;
}

export const ViewEmailTemplateView: React.FC<ViewEmailTemplateViewProps> = ({
  template,
  onBack,
  onEdit
}) => {
  // Parse config if available in tags or description
  let config: Record<string, any> = {};
  try {
    if (template.tags && template.tags.startsWith('{')) {
      config = JSON.parse(template.tags);
    }
  } catch {}

  // Extract subject and banner from config or components
  let subject = config.subject || '';
  let bannerTitle = config.banner_title || template.name;
  let clinicName = config.clinic_name || 'Heal Your Heart Neelankarai';
  let clinicAddress = config.clinic_address || 'Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115';
  let clinicPhone = config.clinic_phone || '9003070065';

  // If template has components, find Subject and Body
  let bodyContent = template.content || template.description || '';
  if (template.sections && template.sections.length > 0) {
    for (const sec of template.sections) {
      for (const comp of sec.components || []) {
        if (comp.label === 'Subject' && comp.default_value) {
          subject = comp.default_value;
        } else if (comp.label === 'Email Body' && comp.default_value) {
          bodyContent = comp.default_value;
        }
      }
    }
  }

  // Format body text with token highlights
  const renderFormattedBody = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\$\{[^}]+\})/g);
    return (
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.65', color: '#1f2937', fontSize: '14.5px' }}>
        {parts.map((part, idx) => {
          if (part.startsWith('${') && part.endsWith('}')) {
            return (
              <span
                key={idx}
                style={{
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '13px'
                }}
              >
                {part}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="charm-view-email-container" style={{ padding: '20px 32px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#1e293b',
            fontSize: '18px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '4px 0'
          }}
        >
          <ArrowLeft size={20} />
          <span>View Email Template</span>
        </button>
      </div>

      {/* Subheader: Template Name, Subject, and Edit Button */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Template Name: </span>
            <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>{template.name}</span>
          </div>
          {subject && (
            <div>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Subject: </span>
              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>{subject}</span>
            </div>
          )}
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(template)}
            style={{
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(245, 158, 11, 0.2)'
            }}
          >
            <Edit2 size={14} />
            <span>Edit</span>
          </button>
        )}
      </div>

      {/* Informational Hint matching CharmHealth */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12.5px',
          color: '#64748b',
          marginBottom: '20px',
          paddingLeft: '4px'
        }}
      >
        <Info size={15} color="#0ea5e9" />
        <span>In order to resize Facility logo, click on the logo</span>
      </div>

      {/* Branded Email Preview Card */}
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}
      >
        {/* Clinic Header Logo Area */}
        <div
          style={{
            padding: '24px 32px 18px 32px',
            textAlign: 'center',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>❤️</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                HEAL YOUR HEART
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#0d9488', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Vaso-Meditech EECP Center · Neelankarai
              </div>
            </div>
          </div>
        </div>

        {/* Teal Hero Banner Strip */}
        <div
          style={{
            backgroundColor: '#20c997',
            color: '#ffffff',
            padding: '14px 24px',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {bannerTitle}
          </div>
          {/* Downward triangle pointer */}
          <div
            style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid #20c997'
            }}
          />
        </div>

        {/* Email Body Content */}
        <div style={{ padding: '36px 36px 28px 36px' }}>
          {renderFormattedBody(bodyContent)}
        </div>

        {/* Amber CTA Bar (Direction | Call) */}
        <div
          style={{
            backgroundColor: '#fef3c7',
            borderTop: '1px solid #fde68a',
            borderBottom: '1px solid #fde68a',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#92400e'
          }}
        >
          <a
            href="https://maps.google.com"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#92400e',
              textDecoration: 'none'
            }}
          >
            <MapPin size={15} />
            <span>Direction</span>
          </a>
          <span style={{ color: '#d97706' }}>|</span>
          <a
            href={`tel:${clinicPhone}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#92400e',
              textDecoration: 'none'
            }}
          >
            <Phone size={15} />
            <span>CALL {clinicPhone}</span>
          </a>
        </div>

        {/* Teal Footer Strip */}
        <div
          style={{
            backgroundColor: '#20c997',
            color: '#ffffff',
            padding: '10px 20px',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.02em'
          }}
        >
          This is an automated email. PLEASE DO NOT REPLY.
        </div>
      </div>
    </div>
  );
};
