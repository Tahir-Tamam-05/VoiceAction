import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, AuthUser, Note } from './types';
import { TopBar } from './components';
import {
  User, Bell, Shield, Download, LogOut,
  Moon, Sun, Verified, ChevronRight, Check, LucideIcon,
} from 'lucide-react';
import { exportCrystals } from './features/export/exportService';
import { notifications as notify } from './features/notifications/notificationService';

interface SettingsScreenProps {
  setScreen: (s: Screen) => void;
  logout: () => void;
  user: AuthUser | null;
  toggleDarkMode: () => void;
  isDark: boolean;
  notes: Note[];
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  setScreen, logout, user, toggleDarkMode, isDark, notes,
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notifState, setNotifState] = useState({ reminders: true, reviews: true, digest: true });
  const [quickLaunch, setQuickLaunch] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('settings_notifications');
      if (saved) {
        const p = JSON.parse(saved);
        setNotifState({
          reminders: p.push ?? true,
          reviews: p.mentions ?? true,
          digest: p.email ?? false,
        });
      }
      setQuickLaunch(localStorage.getItem('va_setting_quicklaunch') === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('settings_notifications', JSON.stringify({
      push: notifState.reminders,
      mentions: notifState.reviews,
      email: notifState.digest,
    }));
  }, [notifState]);

  useEffect(() => {
    localStorage.setItem('va_setting_quicklaunch', String(quickLaunch));
  }, [quickLaunch]);

  const toggle = (key: string) => setExpanded(prev => prev === key ? null : key);

  return (
    <div className="min-h-screen w-full pb-safe-nav pt-20 px-4 sm:px-6 max-w-xl mx-auto">
      <TopBar
        title="Settings"
        onBack={() => setScreen('home')}
        user={user}
        onLogout={logout}
        onSetScreen={setScreen}
        isDark={isDark}
        onToggleDarkMode={toggleDarkMode}
        onExport={() => {
          const r = exportCrystals(notes, { format: 'markdown' });
          r.success ? notify.exportComplete('Markdown') : notify.error(r.error ?? 'Export failed');
        }}
      />

      {/* ── Profile card ─────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-4 p-5 rounded-3xl bg-surface-low border border-primary/5">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center glow-medium overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                : <span className="font-headline font-extrabold text-2xl text-black">{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
              }
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary text-black p-1 rounded-full">
              <Verified size={12} fill="currentColor" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-headline font-extrabold text-xl text-on-surface tracking-tighter truncate">{user?.name ?? 'User'}</h2>
            <p className="text-xs text-text-secondary truncate mt-0.5">{user?.email}</p>
            <p className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-widest mt-1">
              Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Settings groups ───────────────────────────────────── */}
      <div className="space-y-2">

        {/* Appearance */}
        <SettingsRow
          icon={isDark ? Sun : Moon}
          label="Appearance"
          value={isDark ? 'Dark' : 'Light'}
          onClick={toggleDarkMode}
        />

        {/* Quick Launch */}
        <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-highest flex items-center justify-center text-primary">
              <span className="text-base">⚡</span>
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Quick Launch</p>
              <p className="text-[10px] text-text-secondary mt-0.5">Open directly to recording</p>
            </div>
          </div>
          <Toggle active={quickLaunch} onToggle={() => setQuickLaunch(q => !q)} />
        </div>

        {/* Notifications */}
        <ExpandableRow
          id="notifications"
          icon={Bell}
          label="Notifications"
          badge={Object.values(notifState).filter(Boolean).length > 0 ? String(Object.values(notifState).filter(Boolean).length) : undefined}
          expanded={expanded === 'notifications'}
          onToggle={() => toggle('notifications')}
        >
          <div className="space-y-3 pt-2">
            <ToggleRow
              label="Streak reminders"
              desc="Alert when your streak is at risk"
              active={notifState.reminders}
              onToggle={() => setNotifState(s => ({ ...s, reminders: !s.reminders }))}
            />
            <ToggleRow
              label="Review alerts"
              desc="Notify when flashcards are due"
              active={notifState.reviews}
              onToggle={() => setNotifState(s => ({ ...s, reviews: !s.reviews }))}
            />
            <ToggleRow
              label="Weekly digest"
              desc="Summary of your week in thoughts"
              active={notifState.digest}
              onToggle={() => setNotifState(s => ({ ...s, digest: !s.digest }))}
            />
          </div>
        </ExpandableRow>

        {/* Export */}
        <ExpandableRow
          id="export"
          icon={Download}
          label="Export Data"
          expanded={expanded === 'export'}
          onToggle={() => toggle('export')}
        >
          <div className="grid grid-cols-2 gap-2 pt-2">
            {(['markdown', 'csv', 'json', 'txt'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => {
                  const r = exportCrystals(notes, { format: fmt });
                  r.success ? notify.exportComplete(fmt.toUpperCase()) : notify.error(r.error ?? 'Export failed');
                }}
                className="py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                style={{
                  background: 'var(--surface-highest)',
                  color: 'var(--on-surface)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {fmt === 'markdown' ? 'Markdown' : fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </ExpandableRow>

        {/* Security */}
        <ExpandableRow
          id="security"
          icon={Shield}
          label="Security"
          expanded={expanded === 'security'}
          onToggle={() => toggle('security')}
        >
          <div
            className="mt-2 rounded-xl p-3 text-xs text-text-secondary leading-relaxed"
            style={{ background: 'var(--surface-highest)', border: '1px solid var(--border-color)' }}
          >
            Your data is processed with end-to-end encryption standards. Notes are stored locally and optionally synced via Firestore with your explicit consent.
          </div>
          <p className="mt-3 text-[10px] text-text-secondary/40 font-bold uppercase tracking-widest">
            Password changes are managed through your Google or email provider.
          </p>
        </ExpandableRow>

        {/* Sign out */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-98"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <LogOut size={18} className="text-red-400" />
          </div>
          <span className="text-sm font-bold text-red-400">Sign Out</span>
        </button>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="mt-10 text-center space-y-3">
        <p className="text-[10px] font-bold text-text-secondary/25 uppercase tracking-[0.3em]">VoiceAction v1.0.5</p>
        <div className="flex justify-center gap-6">
          {(['Privacy', 'Terms'] as const).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => notify.info(`${l} page coming soon.`)}
              className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/30 hover:text-primary transition-colors"
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Reusable sub-components ──────────────────────────────────

const SettingsRow: React.FC<{
  icon: LucideIcon;
  label: string;
  value?: string;
  danger?: boolean;
  onClick?: () => void;
}> = ({ icon: Icon, label, value, danger, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.99]"
    style={{ background: 'var(--surface-low)', border: '1px solid var(--border-color)' }}
  >
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${danger ? 'bg-red-500/10 text-red-400' : 'bg-surface-highest text-primary'}`}>
        <Icon size={18} />
      </div>
      <span className={`text-sm font-bold ${danger ? 'text-red-400' : 'text-on-surface'}`}>{label}</span>
    </div>
    {value && <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">{value}</span>}
  </button>
);

const ExpandableRow: React.FC<{
  id: string;
  icon: LucideIcon;
  label: string;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ icon: Icon, label, badge, expanded, onToggle, children }) => (
  <div
    className="rounded-2xl overflow-hidden transition-all"
    style={{ background: 'var(--surface-low)', border: '1px solid var(--border-color)' }}
  >
    <button onClick={onToggle} className="w-full flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-surface-highest flex items-center justify-center text-primary">
          <Icon size={18} />
        </div>
        <span className="text-sm font-bold text-on-surface">{label}</span>
        {badge && (
          <span className="bg-primary text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">{badge}</span>
        )}
      </div>
      <motion.div initial={{ rotate: 0 }} animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronRight size={18} className="text-text-secondary/40" />
      </motion.div>
    </button>

    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const Toggle: React.FC<{ active: boolean; onToggle: () => void }> = ({ active, onToggle }) => (
  <button
    onClick={onToggle}
    className="relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center"
    style={{ background: active ? '#f97316' : 'var(--surface-highest)' }}
  >
    <motion.div
      initial={{ x: 2 }}
      animate={{ x: active ? 22 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="w-5 h-5 bg-white rounded-full shadow-md"
    />
  </button>
);

const ToggleRow: React.FC<{
  label: string;
  desc: string;
  active: boolean;
  onToggle: () => void;
}> = ({ label, desc, active, onToggle }) => (
  <div
    className="flex items-center justify-between gap-4 p-3 rounded-xl"
    style={{ background: 'var(--surface-highest)', border: '1px solid var(--border-color)' }}
  >
    <div>
      <p className="text-sm font-bold text-on-surface">{label}</p>
      <p className="text-[10px] text-text-secondary mt-0.5">{desc}</p>
    </div>
    <Toggle active={active} onToggle={onToggle} />
  </div>
);
