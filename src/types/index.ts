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
}

export type ChatMode = 'developer' | 'student';

export type StudentSyllabus = 'CBSE' | 'NCERT';

export interface StudentProfile {
  name: string;
  grade: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  syllabus: StudentSyllabus;
  completedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface WebsiteGenerationMeta {
  isWebsiteRequest: boolean;
  shouldAutoOpen: boolean;
  isBasicWebsite: boolean;
  entryFilePath?: string;
  templateId?: string;
  siteTitle?: string;
  autoApplied?: boolean;
  outputDirectory?: string;
}

export interface StudentChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type EducationBoard = 'CBSE' | 'Karnataka SSLC' | 'Karnataka PUC';

export interface QuestionPaperRecord {
  id: string;
  board: EducationBoard;
  examClass: 10 | 11 | 12;
  year: number;
  subject: string;
  examType: 'regular' | 'compartment';
  sourceUrl: string;
  sourceLabel: string;
  sourcePageUrl: string;
  fileName: string;
  localPath?: string | null;
  textPath?: string | null;
  availableOffline?: boolean;
  extractedTextCached?: boolean;
}

export interface QuestionPaperSearchFilters {
  board?: EducationBoard;
  examClass?: 10 | 11 | 12;
  year?: number;
  subjectQuery?: string;
}

export interface QuestionPaperContent {
  paper: QuestionPaperRecord;
  extractedText: string;
  localPath: string;
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
      createFolder: (path: string) => Promise<boolean>;
      deleteFile: (path: string) => Promise<boolean>;
      deleteFolder: (path: string) => Promise<boolean>;
    };
    auth?: {
      register: (data: { username: string; email: string; password: string }) => Promise<AuthResponse>;
      login: (data: { email: string; password: string }) => Promise<AuthResponse>;
      logout: () => Promise<{ success: boolean }>;
      checkSession: () => Promise<SessionResponse>;
    };
    feedback?: {
      send: (data: { name?: string; email?: string; message: string }) => Promise<FeedbackResponse>;
    };
    runtime?: {
      runCurrentFile: (filePath: string) => Promise<{ success: boolean }>;
      stopRun: () => Promise<{ success: boolean }>;
      restartRun: () => Promise<{ success: boolean }>;
      onRunOutput: (callback: (payload: RunOutputEvent) => void) => () => void;
      onRunStatus: (callback: (payload: RunStatusEvent) => void) => () => void;
    };
    questionPapers?: {
      search: (filters: QuestionPaperSearchFilters) => Promise<QuestionPaperRecord[]>;
      getContent: (paperId: string) => Promise<QuestionPaperContent>;
      refreshCatalog: () => Promise<{ success: boolean; count: number }>;
    };
  }
}

export {};
