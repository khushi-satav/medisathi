'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type NotifType =
  | 'DOSE_REMINDER'
  | 'DOSE_OVERDUE'
  | 'DOSE_MISSED'
  | 'REFILL_ALERT'
  | 'CAREGIVER_ALERT'
  | 'STREAK_MILESTONE'
  | 'WEEKLY_REPORT'
  | 'SYSTEM';

interface AppNotification {
  _id: string;
  type: NotifType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const NOTIF_ICONS: Record<string, string> = {
  DOSE_REMINDER: '💊',
  DOSE_OVERDUE: '⚠️',
  DOSE_MISSED: '❌',
  REFILL_ALERT: '📦',
  CAREGIVER_ALERT: '👥',
  STREAK_MILESTONE: '🔥',
  WEEKLY_REPORT: '📊',
  SYSTEM: 'ℹ️',
};

const NOTIF_COLORS: Record<string, string> = {
  DOSE_REMINDER: '#E8532B',
  DOSE_OVERDUE: '#F5A623',
  DOSE_MISSED: '#EF4444',
  REFILL_ALERT: '#3B82F6',
  CAREGIVER_ALERT: '#8B5CF6',
  STREAK_MILESTONE: '#F59E0B',
  WEEKLY_REPORT: '#10B981',
  SYSTEM: '#6B7280',
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TABS = ['All', 'Medication', 'Caregiver', 'System'] as const;
type Tab = (typeof TABS)[number];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Ref wrapping the entire bell + dropdown container for click-outside
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Click-outside to close (no backdrop, no z-index war) ──────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    // Use capture=true so we catch clicks before any child handlers
    document.addEventListener('mousedown', handleOutside, true);
    return () => document.removeEventListener('mousedown', handleOutside, true);
  }, [isOpen]);

  const fetchNotifications = useCallback(async (tab: Tab = 'All') => {
    setLoading(true);
    try {
      const params = tab !== 'All' ? `&type=${tab}` : '';
      const res = await api.get(`/notifications?limit=20${params}`);
      setNotifications(res.data.notifications ?? []);
      setUnreadCount(res.data.unreadCount ?? 0);
    } catch {
      // silently fail if DB not connected in dev
    }
    setLoading(false);
  }, []);

  // Load on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll for new notifications every 60 s
  useEffect(() => {
    const id = setInterval(() => fetchNotifications(activeTab), 60_000);
    return () => clearInterval(id);
  }, [fetchNotifications, activeTab]);

  // Request browser notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    fetchNotifications(tab);
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {/* ignore */}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {/* ignore */}
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* ── Bell button ── */}
      <button
        id="notif-bell-btn"
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: isOpen ? '#FFF0E8' : 'transparent',
          border: `1.5px solid ${isOpen ? '#E8532B40' : 'transparent'}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.2s',
          fontSize: '20px',
          flexShrink: 0,
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#EF4444',
              color: 'white',
              borderRadius: '10px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              border: '2px solid white',
              animation: 'notifPulse 2s infinite',
              padding: '0 3px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* ── Dropdown panel (no backdrop div needed) ── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '52px',
            right: 0,
            width: '380px',
            maxHeight: '540px',
            background: 'white',
            borderRadius: '18px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            border: '1px solid #F3F4F6',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'notifSlideIn 0.18s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 18px 12px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#1A1A2E' }}>
                Notifications
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                {unreadCount > 0 ? (
                  <span style={{ color: '#E8532B', fontWeight: 600 }}>
                    {unreadCount} unread
                  </span>
                ) : (
                  'All caught up ✓'
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize: '12px',
                  color: '#E8532B',
                  background: '#FFF0E8',
                  border: '1px solid #E8532B30',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              padding: '10px 12px',
              borderBottom: '1px solid #F3F4F6',
              overflowX: 'auto',
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                style={{
                  padding: '5px 13px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  background: activeTab === tab ? '#E8532B' : '#F3F4F6',
                  color: activeTab === tab ? 'white' : '#6B7280',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '12px 16px',
                }}
              >
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', padding: '8px 0' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#F3F4F6',
                        flexShrink: 0,
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          height: '12px',
                          background: '#F3F4F6',
                          borderRadius: '6px',
                          width: '70%',
                          marginBottom: '6px',
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                      <div
                        style={{
                          height: '10px',
                          background: '#F9FAFB',
                          borderRadius: '6px',
                          width: '50%',
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div
                style={{
                  padding: '44px 20px',
                  textAlign: 'center',
                  color: '#9CA3AF',
                }}
              >
                <div style={{ fontSize: '38px', marginBottom: '10px' }}>🔔</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#374151' }}>
                  No notifications yet
                </div>
                <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                  Take your medicines and they&apos;ll appear here
                </div>
              </div>
            )}

            {!loading &&
              notifications.map((notif) => (
                <NotifRow
                  key={notif._id}
                  notif={notif}
                  onRead={() => markRead(notif._id)}
                />
              ))}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #F3F4F6',
              textAlign: 'center',
            }}
          >
            <button
              onClick={() => {
                router.push('/settings?tab=notifications');
                setIsOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#E8532B',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Manage notification settings →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes notifPulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50%       { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(239,68,68,0);  }
        }
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}

// ─── Individual notification row ──────────────────────────────────────────────
function NotifRow({
  notif,
  onRead,
}: {
  notif: AppNotification;
  onRead: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = NOTIF_COLORS[notif.type] || '#6B7280';
  const icon = NOTIF_ICONS[notif.type] || '🔔';

  return (
    <div
      onClick={onRead}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '13px 16px',
        borderBottom: '1px solid #F9FAFB',
        background: hovered ? '#FFF0E8' : notif.isRead ? 'white' : '#FFF8F5',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {/* Icon bubble */}
      <div
        style={{
          width: '38px',
          height: '38px',
          flexShrink: 0,
          borderRadius: '10px',
          background: color + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '17px',
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: notif.isRead ? 500 : 700,
            fontSize: '13px',
            color: '#1A1A2E',
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {notif.title}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#6B7280',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {notif.body}
        </div>
        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
          {timeAgo(notif.createdAt)}
        </div>
      </div>

      {/* Unread dot */}
      {!notif.isRead && (
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#E8532B',
            flexShrink: 0,
            marginTop: '6px',
          }}
        />
      )}
    </div>
  );
}
