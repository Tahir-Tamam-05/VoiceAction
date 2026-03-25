import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, AuthUser, Note } from './types';
import { TopBar } from './components';
import { 
  User, 
  Bell, 
  Shield, 
  Volume2, 
  Cpu, 
  Cloud, 
  ChevronRight, 
  LogOut, 
  Download,
  Moon,
  Sun,
  Verified,
  Crown,
  Lock,
  Eye,
  Smartphone,
  Check,
  Info
} from 'lucide-react';
import { exportAsMarkdown, exportAsCSV } from './utils/exportHelpers';

interface SettingsScreenProps {
  setScreen: (s: Screen) => void;
  logout: () => void;
  user: AuthUser | null;
  toggleDarkMode: () => void;
  isDark: boolean;
  notes: Note[];
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
  setScreen, 
  logout, 
  user, 
  toggleDarkMode, 
  isDark,
  notes
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  
  // Real working settings state
  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    mentions: true
  });
  
  const [privacy, setPrivacy] = useState({
    biometric: false,
    encryption: true,
    analytics: true
  });

  const [voice, setVoice] = useState('Nova (Natural)');
  const [model, setModel] = useState('Gemini 1.5 Pro');

  // Load settings from localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('settings_notifications');
    const savedPrivacy = localStorage.getItem('settings_privacy');
    const savedVoice = localStorage.getItem('settings_voice');
    const savedModel = localStorage.getItem('settings_model');

    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
    if (savedPrivacy) setPrivacy(JSON.parse(savedPrivacy));
    if (savedVoice) setVoice(savedVoice);
    if (savedModel) setModel(savedModel);
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('settings_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('settings_privacy', JSON.stringify(privacy));
  }, [privacy]);

  useEffect(() => {
    localStorage.setItem('settings_voice', voice);
  }, [voice]);

  useEffect(() => {
    localStorage.setItem('settings_model', model);
  }, [model]);

  const toggleExpanded = (item: string) => {
    setExpandedItem(expandedItem === item ? null : item);
  };

  return (
    <div className="min-h-screen w-full pb-32 pt-24 px-4 sm:px-6 max-w-5xl mx-auto">
      <TopBar 
        title="Settings" 
        onBack={() => setScreen('home')} 
        user={user}
        onLogout={logout}
        onSetScreen={setScreen}
        isDark={isDark}
        onToggleDarkMode={toggleDarkMode}
        onExport={() => exportAsMarkdown(notes)}
      />

      {/* Profile Section */}
      <section className="mb-16 flex flex-col md:flex-row items-center gap-8 md:gap-12">
        <div className="relative group">
          <div className="absolute inset-0 bg-primary rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center relative z-10 glow-strong border-2 border-primary/30 overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-headline font-extrabold text-4xl text-black tracking-tighter">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary text-black p-1.5 rounded-full z-20">
            <Verified size={16} fill="currentColor" />
          </div>
        </div>
        <div className="text-center md:text-left">
          <h2 className="font-headline font-extrabold text-4xl md:text-5xl tracking-tighter mb-2 text-on-surface">{user?.name || 'User'}</h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-highest rounded-full ghost-border">
            <Crown size={14} className="text-primary fill-current" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Premium Archive</span>
          </div>
          <p className="text-text-secondary text-sm mt-2">{user?.email}</p>
        </div>
      </section>

      {/* Settings Groups */}
      <div className="space-y-12">
        <SettingsGroup title="01 / ACCOUNT" desc="Manage your global subscription status and data portability controls.">
          <SettingsItem 
            icon={User} 
            label="Personal Information" 
            isExpanded={expandedItem === 'personal'}
            onClick={() => toggleExpanded('personal')}
          >
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Full Name</label>
                  <p className="text-sm font-medium text-on-surface">{user?.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Email Address</label>
                  <p className="text-sm font-medium text-on-surface">{user?.email}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">User ID</label>
                  <p className="text-xs font-mono text-text-secondary">{user?.id}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Joined</label>
                  <p className="text-sm font-medium text-on-surface">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              <button className="w-full py-3 bg-surface-highest rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-colors">
                Update Profile
              </button>
            </div>
          </SettingsItem>

          <SettingsItem 
            icon={Bell} 
            label="Notifications" 
            badge="2"
            isExpanded={expandedItem === 'notifications'}
            onClick={() => toggleExpanded('notifications')}
          >
            <div className="space-y-4 pt-4">
              <ToggleItem 
                label="Push Notifications" 
                desc="Receive alerts for upcoming events and task reminders."
                active={notifications.push}
                onToggle={() => setNotifications(prev => ({ ...prev, push: !prev.push }))}
              />
              <ToggleItem 
                label="Email Updates" 
                desc="Weekly summaries of your voice actions and insights."
                active={notifications.email}
                onToggle={() => setNotifications(prev => ({ ...prev, email: !prev.email }))}
              />
              <ToggleItem 
                label="Smart Mentions" 
                desc="AI-driven alerts when related topics are detected."
                active={notifications.mentions}
                onToggle={() => setNotifications(prev => ({ ...prev, mentions: !prev.mentions }))}
              />
            </div>
          </SettingsItem>

          <SettingsItem 
            icon={Shield} 
            label="Privacy & Security" 
            isExpanded={expandedItem === 'privacy'}
            onClick={() => toggleExpanded('privacy')}
          >
            <div className="space-y-6 pt-4">
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Info size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Data Handling Policy</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Your voice data is processed using end-to-end encryption standards. We utilize the Gemini 1.5 Pro model for linguistic analysis, ensuring that your personal information remains isolated from public training sets. All local data is stored in a sandboxed environment, and cloud synchronization is optional and user-controlled.
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  We do not sell your data to third parties. Our security measures include AES-256 encryption at rest and TLS 1.3 for all data in transit.
                </p>
              </div>

              <div className="space-y-4">
                <ToggleItem 
                  label="Biometric Lock" 
                  desc="Require FaceID or Fingerprint to open the application."
                  active={privacy.biometric}
                  onToggle={() => setPrivacy(prev => ({ ...prev, biometric: !prev.biometric }))}
                />
                <ToggleItem 
                  label="Local Encryption" 
                  desc="Encrypt all local storage data with a custom key."
                  active={privacy.encryption}
                  onToggle={() => setPrivacy(prev => ({ ...prev, encryption: !prev.encryption }))}
                />
                <ToggleItem 
                  label="Anonymous Analytics" 
                  desc="Help us improve by sharing non-identifiable usage data."
                  active={privacy.analytics}
                  onToggle={() => setPrivacy(prev => ({ ...prev, analytics: !prev.analytics }))}
                />
              </div>
            </div>
          </SettingsItem>

          <SettingsItem 
            icon={Download} 
            label="Export Data" 
            onClick={() => exportAsMarkdown(notes)}
          />
        </SettingsGroup>

        <SettingsGroup title="02 / VOICE & AI" desc="Calibrate the monolithic core and linguistic processing models.">
          <SettingsItem 
            icon={Volume2} 
            label="Voice Selection" 
            value={voice}
            isExpanded={expandedItem === 'voice'}
            onClick={() => toggleExpanded('voice')}
          >
            <div className="grid grid-cols-1 gap-2 pt-4">
              {['Nova (Natural)', 'Echo (Deep)', 'Shimmer (Bright)', 'Onyx (Bold)'].map((v) => (
                <button 
                  key={v}
                  onClick={() => setVoice(v)}
                  className={`flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors ${voice === v ? 'bg-primary text-black' : 'bg-surface-highest text-on-surface hover:bg-surface-high'}`}
                >
                  <span>{v}</span>
                  {voice === v && <Check size={16} />}
                </button>
              ))}
            </div>
          </SettingsItem>

          <SettingsItem 
            icon={Cpu} 
            label="AI Model" 
            value={model}
            isExpanded={expandedItem === 'model'}
            onClick={() => toggleExpanded('model')}
          >
            <div className="grid grid-cols-1 gap-2 pt-4">
              {['Gemini 1.5 Pro', 'Gemini 1.5 Flash', 'GPT-4o (Legacy)', 'Claude 3.5 Sonnet'].map((m) => (
                <button 
                  key={m}
                  onClick={() => setModel(m)}
                  className={`flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors ${model === m ? 'bg-primary text-black' : 'bg-surface-highest text-on-surface hover:bg-surface-high'}`}
                >
                  <span>{m}</span>
                  {model === m && <Check size={16} />}
                </button>
              ))}
            </div>
          </SettingsItem>

          <SettingsItem icon={Cloud} label="Cloud Sync" value="Enabled" />
        </SettingsGroup>

        <SettingsGroup title="03 / SYSTEM" desc="Configure interface behaviors and cryptographic privacy standards.">
          <SettingsItem 
            icon={isDark ? Sun : Moon} 
            label="Appearance" 
            value={isDark ? "Dark Mode" : "Light Mode"} 
            onClick={toggleDarkMode}
          />
          <SettingsItem 
            icon={LogOut} 
            label="Sign Out" 
            danger 
            onClick={logout}
          />
        </SettingsGroup>
      </div>

      <div className="mt-12 text-center">
        <p className="text-[10px] font-bold text-text-secondary/20 uppercase tracking-[0.3em]">VoiceAction v1.0.4</p>
      </div>
    </div>
  );
};

const SettingsGroup: React.FC<{ title: string; desc?: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <section className="grid md:grid-cols-[1fr_2fr] gap-8 items-start">
    <div className="md:sticky md:top-32">
      <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-text-secondary mb-4">{title}</h3>
      {desc && <p className="text-sm text-text-secondary leading-relaxed max-w-[200px]">{desc}</p>}
    </div>
    <div className="grid gap-4">
      {children}
    </div>
  </section>
);

const SettingsItem: React.FC<{ 
  icon: any; 
  label: string; 
  value?: string; 
  badge?: string; 
  danger?: boolean;
  isExpanded?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}> = ({ icon: Icon, label, value, badge, danger, isExpanded, onClick, children }) => (
  <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-surface-low rounded-2xl p-1' : ''}`}>
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-5 rounded-xl transition-all border-l-2 border-transparent hover:border-primary ghost-border group ${isExpanded ? 'bg-surface-high' : 'bg-surface-low hover:bg-surface-high'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg bg-surface-highest flex items-center justify-center ${danger ? 'text-red-500' : 'text-primary'}`}>
          <Icon size={20} />
        </div>
        <span className={`font-bold ${danger ? 'text-red-500' : 'text-on-surface'}`}>{label}</span>
      </div>
      
      <div className="flex items-center gap-3">
        {value && !isExpanded && <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">{value}</span>}
        {badge && <span className="bg-primary text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">{badge}</span>}
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={20} className="text-text-secondary group-hover:text-primary transition-colors" />
        </motion.div>
      </div>
    </button>
    
    <AnimatePresence>
      {isExpanded && children && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="px-5 pb-5"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const ToggleItem: React.FC<{ 
  label: string; 
  desc: string; 
  active: boolean; 
  onToggle: () => void;
}> = ({ label, desc, active, onToggle }) => (
  <div className="flex items-center justify-between gap-4 p-3 bg-surface-highest/50 rounded-xl border border-primary/5">
    <div className="space-y-1">
      <p className="text-sm font-bold text-on-surface">{label}</p>
      <p className="text-xs text-text-secondary leading-tight">{desc}</p>
    </div>
    <button 
      onClick={onToggle}
      className={`relative w-10 h-6 rounded-full transition-colors duration-300 flex items-center px-1 ${active ? 'bg-primary' : 'bg-surface-highest'}`}
    >
      <motion.div 
        animate={{ x: active ? 16 : 0 }}
        className="w-4 h-4 bg-white rounded-full shadow-lg"
      />
    </button>
  </div>
);
