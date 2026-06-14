export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
  size?: number;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface UserSession {
  userId: number;
  token: string;
  username: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  username?: string;
  error?: string;
}

export interface SessionResponse {
  success: boolean;
  session?: UserSession;
}

export interface FeedbackResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DialogFileResult {
  path: string;
  name: string;
  content: string;
}

export interface SavedFileResult {
  path: string;
  name: string;
}

export interface RunOutputEvent {
  type: 'stdout' | 'stderr' | 'system';
  message: string;
}

export interface RunStatusEvent {
  state: 'idle' | 'running' | 'stopped' | 'error';
  filePath?: string;
  code?: number | null;
  signal?: NodeJS.Signals | null;
  message?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      openExternalLink: (url: string) => Promise<boolean>;
      openLocalFile: (filePath: string) => Promise<boolean>;
    };
    fileSystem?: {
      openFolderDialog: () => Promise<string | null>;
      openFileDialog: () => Promise<DialogFileResult | null>;
      saveFileDialog: (payload: { defaultPath?: string; content: string }) => Promise<SavedFileResult | null>;
      readDirectory: (path: string) => Promise<FileNode[]>;
      readFile: (path: string) => Promise<string>;
      writeFile: (path: string, content: string) => Promise<boolean>;
      createFile: (path: string) => Promise<boolean>;
      createFolder: (targetPath: string) => Promise<void>;
      deleteFile: (targetPath: string) => Promise<void>;
      deleteFolder: (targetPath: string) => Promise<void>;
      editFile?: (targetPath: string, oldText: string, newText: string) => Promise<{ success: boolean }>;
      searchFiles?: (query: string) => Promise<{path: string, name: string}[]>;
    };
    auth: {
      register: (data: any) => Promise<any>;
      login: (data: any) => Promise<any>;
      logout: () => Promise<void>;
      checkSession: () => Promise<any>;
    };
    feedback: {
      send: (data: any) => Promise<void>;
    };
    runtime: {
      runCurrentFile: (filePath: string) => Promise<void>;
      stopRun: () => Promise<void>;
      restartRun: () => Promise<void>;
      onRunOutput: (callback: (payload: RunOutputEvent) => void) => () => void;
      onRunStatus: (callback: (payload: RunStatusEvent) => void) => () => void;
      runTerminalCommand: (command: string) => Promise<{ stdout: string; stderr: string }>;
      initTerminal?: () => void;
      onTerminalData?: (callback: (data: string) => void) => () => void;
      sendTerminalInput?: (data: string) => void;
      resizeTerminal?: (cols: number, rows: number) => void;
    };
    git?: {
      status: () => Promise<string>;
      add: (file: string) => Promise<void>;
      commit: (message: string) => Promise<void>;
    };
  }
}

export {};
