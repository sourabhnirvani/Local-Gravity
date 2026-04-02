import { useState } from 'react';
import { Bot, LucideIcon, MessageSquare, Monitor, Moon, Palette, Settings as SettingsIcon, Sun, User, X } from 'lucide-react';
import FeedbackForm from './FeedbackForm';
import { settingsService, AppSettings } from '../services/settingsService';
import { StudentProfile, StudentSyllabus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
  onLogout: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

type Tab = 'general' | 'appearance' | 'ai' | 'account' | 'feedback';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'ai', label: 'AI', icon: Bot },
  { id: 'account', label: 'Account', icon: User },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
];

export default function SettingsModal({
  isOpen,
  onClose,
  username,
  onLogout,
  settings,
  onSettingsChange,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general');

  if (!isOpen) {
    return null;
  }

  const handleSave = (updated: Partial<AppSettings>) => {
    const next = { ...settings, ...updated };
    onSettingsChange(next);
    settingsService.save(next);
  };

  const studentProfileDraft: StudentProfile = settings.studentProfile ?? {
    name: '',
    grade: 5,
    syllabus: 'CBSE',
    completedAt: new Date().toISOString(),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative mx-4 flex h-[520px] w-full max-w-[720px] overflow-hidden rounded-xl border border-[#2a2a32] bg-[#1a1a1f] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex w-[180px] shrink-0 flex-col border-r border-[#2a2a32] bg-[#0e0e11]">
          <div className="px-4 pb-3 pt-5 text-xs font-semibold uppercase tracking-widest text-[#555577]">Settings</div>
          <nav className="flex flex-col gap-0.5 px-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  activeTab === tab.id ? 'bg-[#3b82f6] text-white' : 'text-[#858585] hover:bg-[#1a1a1f] hover:text-[#cccccc]'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="px-4 py-3 text-[10px] text-[#333344]">v1.0.0</div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2a2a32] px-6 py-4">
            <h2 className="text-base font-semibold text-[#cccccc]">{TABS.find((tab) => tab.id === activeTab)?.label}</h2>
            <button onClick={onClose} className="rounded p-1.5 text-[#858585] transition-colors hover:bg-[#2a2a32] hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeTab === 'general' && (
              <div className="flex flex-col gap-6">
                <SettingRow label="Auto Save" description="Automatically save files on change">
                  <Toggle value={settings.autoSave} onChange={(value) => handleSave({ autoSave: value })} />
                </SettingRow>
                <SettingRow label="Word Wrap" description="Wrap long lines in the editor">
                  <Toggle value={settings.wordWrap} onChange={(value) => handleSave({ wordWrap: value })} />
                </SettingRow>
                <SettingRow label="Tab Size" description="Number of spaces per tab">
                  <select
                    value={settings.tabSize}
                    onChange={(event) => handleSave({ tabSize: Number(event.target.value) })}
                    className="rounded-md border border-[#2a2a32] bg-[#0e0e11] px-2 py-1 text-sm text-[#cccccc] focus:border-[#3b82f6] focus:outline-none"
                  >
                    {[2, 4, 8].map((size) => (
                      <option key={size} value={size}>
                        {size} spaces
                      </option>
                    ))}
                  </select>
                </SettingRow>
                <SettingRow label="Line Numbers" description="Show line numbers in the editor">
                  <Toggle value={settings.lineNumbers} onChange={(value) => handleSave({ lineNumbers: value })} />
                </SettingRow>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="flex flex-col gap-6">
                <SettingRow label="Theme" description="Choose your color theme">
                  <div className="flex items-center gap-2">
                    {(['dark', 'light', 'system'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => handleSave({ theme })}
                        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                          settings.theme === theme
                            ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-[#60a5fa]'
                            : 'border-[#2a2a32] text-[#858585] hover:border-[#3c3c4c]'
                        }`}
                      >
                        {theme === 'dark' && <Moon size={12} />}
                        {theme === 'light' && <Sun size={12} />}
                        {theme === 'system' && <Monitor size={12} />}
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow label="Font Size" description="Editor font size in pixels">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSave({ fontSize: Math.max(10, settings.fontSize - 1) })}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#2a2a32] text-sm text-[#858585] transition-colors hover:border-[#3b82f6] hover:text-white"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm text-[#cccccc]">{settings.fontSize}</span>
                    <button
                      onClick={() => handleSave({ fontSize: Math.min(24, settings.fontSize + 1) })}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#2a2a32] text-sm text-[#858585] transition-colors hover:border-[#3b82f6] hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </SettingRow>
                <SettingRow label="Font Family" description="Editor monospace font">
                  <select
                    value={settings.fontFamily}
                    onChange={(event) => handleSave({ fontFamily: event.target.value })}
                    className="rounded-md border border-[#2a2a32] bg-[#0e0e11] px-2 py-1 text-sm text-[#cccccc] focus:border-[#3b82f6] focus:outline-none"
                  >
                    {['Consolas', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'monospace'].map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </SettingRow>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4 rounded-lg border border-[#2a2a32] bg-[#0e0e11] p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3b82f6] text-lg font-bold text-white">
                    {username ? username[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="font-medium text-[#cccccc]">{username || 'Guest'}</p>
                    <p className="text-xs text-[#555577]">LocalGravity account</p>
                  </div>
                </div>
                <p className="text-sm text-[#858585]">Your account data is stored locally in SQLite and the session persists through electron-store.</p>
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="self-start rounded-md border border-red-500/30 bg-red-600/10 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-600/20"
                >
                  Sign Out
                </button>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="flex flex-col gap-6">
                <SettingRow label="Default AI Mode" description="Choose which assistant experience opens in the chat panel">
                  <div className="flex items-center gap-2">
                    {(['developer', 'student'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => handleSave({ aiMode: mode })}
                        className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                          settings.aiMode === mode
                            ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-[#60a5fa]'
                            : 'border-[#2a2a32] text-[#858585] hover:border-[#3c3c4c]'
                        }`}
                      >
                        {mode === 'developer' ? 'Developer' : 'Student'}
                      </button>
                    ))}
                  </div>
                </SettingRow>

                <div className="rounded-lg border border-[#2a2a32] bg-[#0e0e11] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[#cccccc]">Student profile</p>
                      <p className="mt-1 text-xs text-[#555577]">Used to personalize explanations, practice sets, and lesson difficulty in student mode.</p>
                    </div>
                    {settings.studentProfile ? (
                      <button
                        onClick={() => handleSave({ studentProfile: null })}
                        className="rounded-md border border-red-500/30 bg-red-600/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-600/20"
                      >
                        Reset
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-[#858585]">Name</span>
                      <input
                        value={settings.studentProfile?.name ?? ''}
                        onChange={(event) =>
                          handleSave({
                            studentProfile: {
                              ...studentProfileDraft,
                              name: event.target.value,
                            },
                          })
                        }
                        placeholder="Student name"
                        className="rounded-md border border-[#2a2a32] bg-[#15161b] px-3 py-2 text-sm text-[#cccccc] focus:border-[#3b82f6] focus:outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-[#858585]">Class</span>
                      <select
                        value={studentProfileDraft.grade}
                        onChange={(event) =>
                          handleSave({
                            studentProfile: {
                              ...studentProfileDraft,
                              grade: Number(event.target.value) as StudentProfile['grade'],
                            },
                          })
                        }
                        className="rounded-md border border-[#2a2a32] bg-[#15161b] px-3 py-2 text-sm text-[#cccccc] focus:border-[#3b82f6] focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                          <option key={grade} value={grade}>
                            Class {grade}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-[#858585]">Syllabus</span>
                      <select
                        value={studentProfileDraft.syllabus}
                        onChange={(event) =>
                          handleSave({
                            studentProfile: {
                              ...studentProfileDraft,
                              syllabus: event.target.value as StudentSyllabus,
                            },
                          })
                        }
                        className="rounded-md border border-[#2a2a32] bg-[#15161b] px-3 py-2 text-sm text-[#cccccc] focus:border-[#3b82f6] focus:outline-none"
                      >
                        {(['CBSE', 'NCERT'] as const).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'feedback' && <FeedbackForm />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[#cccccc]">{label}</p>
        <p className="mt-0.5 text-xs text-[#555577]">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className={`relative h-5 w-10 rounded-full transition-colors ${value ? 'bg-[#3b82f6]' : 'bg-[#2a2a32]'}`}>
      <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}
