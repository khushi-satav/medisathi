'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';


// ─── Types ────────────────────────────────────────────────────────────────────
interface MedResult {
  _id: string;
  name: string;
  dosage: string;
  color: string;
  stockCount: number;
  nextDose: string;
  condition?: string;
}

interface PageResult {
  title: string;
  path: string;
  icon: string;
  description: string;
}

interface MedicineInfo {
  name: string;
  genericName?: string;
  drugClass?: string;
  description?: string;
  indications?: string;
  sideEffects?: string[];
  interactions?: string[];
}

interface SearchResults {
  medications: MedResult[];
  pages: PageResult[];
  medicineInfo: MedicineInfo | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '10px',
        fontWeight: 700,
        color: '#9CA3AF',
        letterSpacing: '1.2px',
        textTransform: 'uppercase',
        padding: '8px 14px 4px',
      }}
    >
      {children}
    </div>
  );
}

function ResultRow({
  icon,
  title,
  subtitle,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        borderRadius: '10px',
        cursor: 'pointer',
        background: hovered ? '#FFF8F5' : 'transparent',
        transition: 'background 0.15s',
        margin: '0 4px',
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#1A1A2E',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '1px' }}>{subtitle}</div>
        )}
      </div>
      {badge && <div style={{ flexShrink: 0 }}>{badge}</div>}
      <span style={{ color: '#D1D5DB', fontSize: '12px' }}>→</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
  }, []);

  // Focus input reliably using rAF after state update flushes
  const openSearch = useCallback(() => {
    setIsOpen(true);
    // rAF fires after the browser paints the newly mounted input
    requestAnimationFrame(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    });
  }, []);

  // Click-outside to close (modal card stops propagation, so only overlay clicks fire)
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleOutside, true);
    return () => document.removeEventListener('mousedown', handleOutside, true);
  }, [isOpen, close]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close, openSearch]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.data as SearchResults);
      } catch {
        setResults(null);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = (path: string) => {
    router.push(path);
    close();
  };

  const quickActions = [
    { icon: '💊', label: 'Add Medication', path: '/medications?add=true' },
    { icon: '📷', label: 'Scan Prescription', path: '/scan-rx' },
    { icon: '🤖', label: 'View AI Insights', path: '/insights' },
    { icon: '👥', label: 'Manage Caregivers', path: '/settings?tab=privacy' },
    { icon: '📅', label: "Today's Schedule", path: '/dose-tracker' },
  ];

  const hasResults =
    results &&
    (results.medications.length > 0 || results.pages.length > 0 || results.medicineInfo);

  return (
    <>
      {/* ── Trigger button in TopNav ── */}
      <button
        id="global-search-trigger"
        onClick={openSearch}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--card, #F8F4F0)',
          border: '1.5px solid var(--border, #E8D5C8)',
          borderRadius: '12px',
          padding: '9px 16px',
          cursor: 'pointer',
          width: '280px',
          transition: 'all 0.2s',
          userSelect: 'none',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#E8532B50';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border, #E8D5C8)';
        }}
      >
        <span style={{ color: '#9CA3AF', fontSize: '15px' }}>🔍</span>
        <span style={{ color: '#9CA3AF', fontSize: '13.5px', flex: 1, textAlign: 'left' }}>
          Search medications, doses...
        </span>
        <kbd
          style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            padding: '2px 6px',
            fontSize: '10px',
            color: '#9CA3AF',
            fontFamily: 'monospace',
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* ── Full-screen search modal ── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '72px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          {/* Modal card — click-outside handled by document listener above */}
          <div
            ref={modalRef}
            style={{
              background: 'white',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '72vh',
              overflow: 'hidden',
              boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'searchSlideIn 0.18s ease-out',
            }}
          >
            {/* Input row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{loading ? '⏳' : '🔍'}</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search medications, doses, features..."
                autoFocus
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '16px',
                  color: '#1A1A2E',
                  background: 'transparent',
                  fontFamily: 'inherit',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    background: '#F3F4F6',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              )}
              <kbd
                style={{
                  background: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  color: '#6B7280',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
                onClick={close}
              >
                ESC
              </kbd>
            </div>

            {/* Results scroll area */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0 12px' }}>
              {/* ── Quick actions (empty state) ── */}
              {!query && (
                <div>
                  <SectionLabel>Quick Actions</SectionLabel>
                  {quickActions.map((action) => (
                    <ResultRow
                      key={action.label}
                      icon={
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            background: '#FFF0E8',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '17px',
                          }}
                        >
                          {action.icon}
                        </div>
                      }
                      title={action.label}
                      onClick={() => navigate(action.path)}
                    />
                  ))}
                </div>
              )}

              {/* ── Medication results ── */}
              {results && results.medications.length > 0 && (
                <div>
                  <SectionLabel>💊 Your Medications</SectionLabel>
                  {results.medications.map((med) => (
                    <ResultRow
                      key={med._id}
                      icon={
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            background: (med.color || '#6C63FF') + '20',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '17px',
                          }}
                        >
                          💊
                        </div>
                      }
                      title={med.name}
                      subtitle={`${med.dosage}  ·  Next: ${med.nextDose}`}
                      badge={
                        med.stockCount < 10 ? (
                          <span
                            style={{
                              background: '#FEF3C7',
                              color: '#D97706',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '20px',
                            }}
                          >
                            ⚠️ Low stock
                          </span>
                        ) : null
                      }
                      onClick={() => navigate(`/medications`)}
                    />
                  ))}
                </div>
              )}

              {/* ── Pages / features ── */}
              {results && results.pages.length > 0 && (
                <div>
                  <SectionLabel>📄 Pages &amp; Features</SectionLabel>
                  {results.pages.map((page) => (
                    <ResultRow
                      key={page.path}
                      icon={
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            background: '#F3F4F6',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '17px',
                          }}
                        >
                          {page.icon}
                        </div>
                      }
                      title={page.title}
                      subtitle={page.description}
                      onClick={() => navigate(page.path)}
                    />
                  ))}
                </div>
              )}

              {/* ── Medicine info card ── */}
              {results?.medicineInfo && (
                <div style={{ padding: '4px 18px' }}>
                  <SectionLabel>ℹ️ Medicine Information</SectionLabel>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
                      borderRadius: '14px',
                      padding: '16px',
                      border: '1px solid #BAE6FD',
                      margin: '0 4px',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                      {results.medicineInfo.name}
                      {results.medicineInfo.drugClass && (
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '11px',
                            background: '#DBEAFE',
                            color: '#1D4ED8',
                            padding: '2px 8px',
                            borderRadius: '20px',
                            fontWeight: 600,
                          }}
                        >
                          {results.medicineInfo.drugClass}
                        </span>
                      )}
                    </div>
                    {results.medicineInfo.genericName && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                        Generic: {results.medicineInfo.genericName}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '12.5px',
                        color: '#374151',
                        lineHeight: 1.6,
                        marginBottom: results.medicineInfo.interactions?.length ? '8px' : 0,
                      }}
                    >
                      {results.medicineInfo.description ||
                        results.medicineInfo.indications ||
                        'No description available.'}
                    </div>
                    {results.medicineInfo.interactions &&
                      results.medicineInfo.interactions.length > 0 && (
                        <div style={{ color: '#DC2626', fontSize: '11.5px', fontWeight: 600 }}>
                          ⚠️ Interacts with:{' '}
                          {results.medicineInfo.interactions.slice(0, 3).join(', ')}
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* ── No results ── */}
              {query && results && !hasResults && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '48px 20px',
                    color: '#9CA3AF',
                  }}
                >
                  <div style={{ fontSize: '38px', marginBottom: '12px' }}>🔍</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#374151' }}>
                    No results for &quot;{query}&quot;
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '6px' }}>
                    Try a medicine name, feature, or setting
                  </div>
                </div>
              )}

              {/* ── Loading skeleton ── */}
              {loading && !results && (
                <div style={{ padding: '20px 18px' }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '10px 14px',
                        marginBottom: '4px',
                      }}
                    >
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          background: '#F3F4F6',
                          borderRadius: '10px',
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            height: '12px',
                            background: '#F3F4F6',
                            borderRadius: '6px',
                            width: '60%',
                            marginBottom: '6px',
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                        <div
                          style={{
                            height: '10px',
                            background: '#F9FAFB',
                            borderRadius: '6px',
                            width: '40%',
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div
              style={{
                padding: '10px 20px',
                borderTop: '1px solid #F3F4F6',
                display: 'flex',
                gap: '16px',
                fontSize: '11px',
                color: '#9CA3AF',
              }}
            >
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes searchSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </>
  );
}
