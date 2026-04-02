import { contextBridge, ipcRenderer } from 'electron';

interface DialogFileResult {
  path: string;
  name: string;
  content: string;
}

interface SavedFileResult {
  path: string;
  name: string;
}

interface RunOutputEvent {
  type: 'stdout' | 'stderr' | 'system';
  message: string;
}

interface RunStatusEvent {
  state: 'idle' | 'running' | 'stopped' | 'error';
  filePath?: string;
  code?: number | null;
  signal?: NodeJS.Signals | null;
  message?: string;
}

interface QuestionPaperSearchFilters {
  board?: 'CBSE' | 'Karnataka SSLC' | 'Karnataka PUC';
  examClass?: 10 | 11 | 12;
  year?: number;
  subjectQuery?: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  openExternalLink: (url: string) => ipcRenderer.invoke('open-external-link', url),
  openLocalFile: (filePath: string) => ipcRenderer.invoke('open-local-file', filePath),
});

contextBridge.exposeInMainWorld('fileSystem', {
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog') as Promise<DialogFileResult | null>,
  saveFileDialog: (payload: { defaultPath?: string; content: string }) => ipcRenderer.invoke('save-file-dialog', payload) as Promise<SavedFileResult | null>,
  readDirectory: (targetPath: string) => ipcRenderer.invoke('read-directory', targetPath),
  readFile: (targetPath: string) => ipcRenderer.invoke('read-file', targetPath),
  writeFile: (targetPath: string, content: string) => ipcRenderer.invoke('write-file', targetPath, content),
  createFile: (targetPath: string) => ipcRenderer.invoke('create-file', targetPath),
  createFolder: (targetPath: string) => ipcRenderer.invoke('create-folder', targetPath),
  deleteFile: (targetPath: string) => ipcRenderer.invoke('delete-file', targetPath),
  deleteFolder: (targetPath: string) => ipcRenderer.invoke('delete-folder', targetPath),
});

contextBridge.exposeInMainWorld('auth', {
  register: (data: { username: string; email: string; password: string }) => ipcRenderer.invoke('auth-register', data),
  login: (data: { email: string; password: string }) => ipcRenderer.invoke('auth-login', data),
  logout: () => ipcRenderer.invoke('auth-logout'),
  checkSession: () => ipcRenderer.invoke('auth-check-session'),
});

contextBridge.exposeInMainWorld('feedback', {
  send: (data: { name?: string; email?: string; message: string }) => ipcRenderer.invoke('send-feedback', data),
});

contextBridge.exposeInMainWorld('runtime', {
  runCurrentFile: (filePath: string) => ipcRenderer.invoke('run-current-file', filePath),
  stopRun: () => ipcRenderer.invoke('stop-run'),
  restartRun: () => ipcRenderer.invoke('restart-run'),
  onRunOutput: (callback: (payload: RunOutputEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: RunOutputEvent) => callback(payload);
    ipcRenderer.on('run-output', listener);
    return () => ipcRenderer.removeListener('run-output', listener);
  },
  onRunStatus: (callback: (payload: RunStatusEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: RunStatusEvent) => callback(payload);
    ipcRenderer.on('run-status', listener);
    return () => ipcRenderer.removeListener('run-status', listener);
  },
});

contextBridge.exposeInMainWorld('questionPapers', {
  search: (filters: QuestionPaperSearchFilters) => ipcRenderer.invoke('question-papers-search', filters),
  getContent: (paperId: string) => ipcRenderer.invoke('question-papers-get-content', paperId),
  refreshCatalog: () => ipcRenderer.invoke('question-papers-refresh'),
});
