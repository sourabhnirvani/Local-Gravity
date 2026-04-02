import { ChatMode, StudentProfile } from '../types';

export interface AppSettings {
    autoSave: boolean;
    wordWrap: boolean;
    tabSize: number;
    lineNumbers: boolean;
    theme: 'dark' | 'light' | 'system';
    fontSize: number;
    fontFamily: string;
    aiMode: ChatMode;
    studentProfile: StudentProfile | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
    autoSave: false,
    wordWrap: false,
    tabSize: 4,
    lineNumbers: true,
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'Consolas',
    aiMode: 'developer',
    studentProfile: null,
};

const STORAGE_KEY = 'localgravity_settings';

export const settingsService = {
    load(): AppSettings {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return DEFAULT_SETTINGS;
            return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        } catch {
            return DEFAULT_SETTINGS;
        }
    },

    save(settings: AppSettings): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            console.error('Failed to save settings');
        }
    },
};
