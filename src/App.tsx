import { useCallback, useEffect, useState } from 'react';
import ActivityBar from './components/ActivityBar';
import AuthScreen from './components/AuthScreen';
import CommandPalette from './components/CommandPalette';
import EditorLayout from './components/EditorLayout';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import StudentWorkspace from './components/StudentWorkspace';
import TitleBar from './components/TitleBar';
import { authService } from './services/authService';
import { AppSettings, settingsService } from './services/settingsService';
import { ChatMode, FileNode, OpenFile, RunOutputEvent, RunStatusEvent, StudentProfile } from './types';

export type ViewType = 'explorer' | 'search' | 'git' | 'ai';

const DEFAULT_ABOUT = 'LocalGravity v1.0.0\nElectron + React + TypeScript desktop editor';

function getLanguageFromExtension(extension: string): string {
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    java: 'java',
    json: 'json',
    html: 'html',
    css: 'css',
    md: 'markdown',
    sh: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
    ps1: 'powershell',
  };
  return map[extension] ?? 'plaintext';
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, '/').toLowerCase();
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('explorer');
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(settingsService.load());

  const [aiPanelWidth, setAiPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [outputVisible, setOutputVisible] = useState(true);
  const [outputLines, setOutputLines] = useState<RunOutputEvent[]>([]);
  const [runStatus, setRunStatus] = useState<RunStatusEvent['state']>('idle');

  const activeFile = openFiles[activeFileIndex];
  const isStudentMode = settings.aiMode === 'student';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authService.checkSession();
        if (response.success && response.session) {
          setIsAuthenticated(true);
          setUsername(response.session.username);
        }
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const unsubscribeOutput = window.runtime?.onRunOutput((payload) => {
      setOutputVisible(true);
      setOutputLines((current) => [...current, payload]);
    });
    const unsubscribeStatus = window.runtime?.onRunStatus((payload) => {
      setRunStatus(payload.state);
    });

    return () => {
      unsubscribeOutput?.();
      unsubscribeStatus?.();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light', settings.theme === 'light');
  }, [settings.theme]);

  const refreshFileTree = useCallback(async (targetPath: string | null = rootPath) => {
    if (!targetPath || !window.fileSystem) {
      return;
    }

    try {
      const files = await window.fileSystem.readDirectory(targetPath);
      setFileTree(files);
    } catch (error) {
      console.error('Error refreshing file tree:', error);
    }
  }, [rootPath]);

  const upsertOpenFile = useCallback((filePath: string, content: string) => {
    const fileName = filePath.split(/[\\/]/).pop() ?? 'untitled';
    const extension = fileName.split('.').pop() ?? '';
    const nextFile: OpenFile = {
      path: filePath,
      name: fileName,
      content,
      language: getLanguageFromExtension(extension),
      isDirty: false,
    };

    setOpenFiles((current) => {
      const existingIndex = current.findIndex((file) => normalizePath(file.path) === normalizePath(filePath));
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = nextFile;
        setActiveFileIndex(existingIndex);
        return next;
      }

      setActiveFileIndex(current.length);
      return [...current, nextFile];
    });
  }, []);

  const handleLoginSuccess = (nextUsername: string) => {
    setIsAuthenticated(true);
    setUsername(nextUsername);
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setUsername(null);
    setOpenFiles([]);
    setRootPath(null);
    setFileTree([]);
    setOutputLines([]);
    setRunStatus('idle');
  };

  const handleOpenFolder = async () => {
    const selectedPath = await window.fileSystem?.openFolderDialog();
    if (!selectedPath) {
      return;
    }

    setRootPath(selectedPath);
    setSearchQuery('');
    setActiveView('explorer');
    const files = await window.fileSystem?.readDirectory(selectedPath);
    setFileTree(files ?? []);
  };

  const handleOpenFile = async () => {
    try {
      const result = await window.fileSystem?.openFileDialog();
      if (!result) {
        return;
      }

      upsertOpenFile(result.path, result.content);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to open file');
    }
  };

  const handleCreateFile = async () => {
    if (!rootPath || !window.fileSystem) {
      alert('Open a project folder first.');
      return;
    }

    const fileName = prompt('Enter relative file path (example: src/App.tsx)');
    if (!fileName) {
      return;
    }

    const fullPath = `${rootPath}/${fileName}`;
    await window.fileSystem.createFile(fullPath);
    await refreshFileTree(rootPath);
    upsertOpenFile(fullPath, '');
  };

  const handleCreateFolder = async () => {
    if (!rootPath || !window.fileSystem) {
      alert('Open a project folder first.');
      return;
    }

    const folderName = prompt('Enter relative folder path');
    if (!folderName) {
      return;
    }

    await window.fileSystem.createFolder(`${rootPath}/${folderName}`);
    await refreshFileTree(rootPath);
  };

  const handleFileOpen = async (filePath: string) => {
    const existingIndex = openFiles.findIndex((file) => normalizePath(file.path) === normalizePath(filePath));
    if (existingIndex >= 0) {
      setActiveFileIndex(existingIndex);
      return;
    }

    const content = await window.fileSystem?.readFile(filePath);
    if (typeof content === 'string') {
      upsertOpenFile(filePath, content);
    }
  };

  const handleFileClose = (index: number) => {
    setOpenFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setActiveFileIndex((current) => Math.max(0, index >= current ? current - 1 : current));
  };

  const handleContentChange = (content: string) => {
    setOpenFiles((current) => {
      const next = [...current];
      if (!next[activeFileIndex]) {
        return current;
      }
      next[activeFileIndex] = { ...next[activeFileIndex], content, isDirty: true };
      return next;
    });
  };

  const handleFileSave = useCallback(async () => {
    if (!activeFile || !window.fileSystem) {
      return;
    }

    await window.fileSystem.writeFile(activeFile.path, activeFile.content);
    setOpenFiles((current) => current.map((file, index) => (index === activeFileIndex ? { ...file, isDirty: false } : file)));
    await refreshFileTree();
  }, [activeFile, activeFileIndex, refreshFileTree]);

  const handleSaveAs = async () => {
    if (!activeFile || !window.fileSystem) {
      return;
    }

    const result = await window.fileSystem.saveFileDialog({ defaultPath: activeFile.path, content: activeFile.content });
    if (!result) {
      return;
    }

    upsertOpenFile(result.path, activeFile.content);
    await refreshFileTree();
  };

  const handleRunCode = async () => {
    if (!activeFile || !window.runtime) {
      alert('Open a supported file first.');
      return;
    }

    setOutputLines([]);
    setOutputVisible(true);
    try {
      await window.runtime.runCurrentFile(activeFile.path);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run file';
      setRunStatus('error');
      setOutputLines([{ type: 'stderr', message }]);
    }
  };

  const handleStopExecution = async () => {
    await window.runtime?.stopRun();
  };

  const handleRestartExecution = async () => {
    setOutputVisible(true);
    setOutputLines([]);
    try {
      await window.runtime?.restartRun();
    } catch (error) {
      setOutputLines([{ type: 'stderr', message: error instanceof Error ? error.message : 'Failed to restart process' }]);
    }
  };

  const dispatchEditorEvent = (name: string, detail?: Record<string, unknown>) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  };

  const handleSettingsChange = useCallback((nextSettings: AppSettings) => {
    setSettings(nextSettings);
    settingsService.save(nextSettings);
  }, []);

  const handleAiModeChange = useCallback((aiMode: ChatMode) => {
    handleSettingsChange({ ...settings, aiMode });
  }, [handleSettingsChange, settings]);

  const handleStudentProfileChange = useCallback((studentProfile: StudentProfile | null) => {
    handleSettingsChange({ ...settings, studentProfile });
  }, [handleSettingsChange, settings]);

  const handleGoToLine = () => {
    const line = prompt('Go to line:');
    if (!line) {
      return;
    }
    const parsed = Number(line);
    if (!Number.isNaN(parsed)) {
      dispatchEditorEvent('go-to-line', { line: parsed });
    }
  };

  const handleFind = () => {
    const query = prompt('Find in file:');
    if (query) {
      dispatchEditorEvent('find-in-file', { query });
    }
  };

  const handleReplace = () => {
    const find = prompt('Replace which text?');
    if (!find) {
      return;
    }
    const replace = prompt(`Replace "${find}" with:`) ?? '';
    dispatchEditorEvent('replace-in-file', { find, replace });
  };

  const handleSearchInProject = () => {
    setActiveView('search');
    const query = prompt('Search files in project:', searchQuery);
    if (query !== null) {
      setSearchQuery(query);
    }
  };

  const handleApplyCode = async (filePath: string, content: string) => {
    if (!rootPath || !window.fileSystem) {
      alert('Open a workspace folder first.');
      return;
    }

    await window.fileSystem.writeFile(filePath, content);
    upsertOpenFile(filePath, content);
    await refreshFileTree();
  };

  const handleLivePreview = (filePath: string, content: string) => {
    const fileName = filePath.split(/[\\/]/).pop() ?? 'untitled';
    const extension = fileName.split('.').pop() ?? '';
    setOpenFiles((current) => {
      const existingIndex = current.findIndex((file) => normalizePath(file.path) === normalizePath(filePath));
      const previewFile: OpenFile = {
        path: filePath,
        name: fileName,
        content,
        language: getLanguageFromExtension(extension),
        isDirty: true,
      };

      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = previewFile;
        setActiveFileIndex(existingIndex);
        return next;
      }

      setActiveFileIndex(current.length);
      return [...current, previewFile];
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (isStudentMode) {
        if (mod && event.key === ',') {
          event.preventDefault();
          setSettingsOpen(true);
        }
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setCommandPaletteOpen((current) => !current);
      }
      if (mod && event.key === ',') {
        event.preventDefault();
        setSettingsOpen(true);
      }
      if (mod && !event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handleCreateFile();
      }
      if (mod && !event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        handleOpenFile();
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        handleOpenFolder();
      }
      if (mod && !event.shiftKey && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        if (openFiles.length > 0) {
          handleFileClose(activeFileIndex);
        }
      }
      if (mod && !event.shiftKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        handleGoToLine();
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        handleSearchInProject();
      }
      if (event.key === 'F5' && !event.shiftKey && !event.ctrlKey) {
        event.preventDefault();
        handleRunCode();
      }
      if (event.key === 'F5' && event.shiftKey) {
        event.preventDefault();
        handleStopExecution();
      }
      if (event.key === '`' && mod) {
        event.preventDefault();
        setOutputVisible((current) => !current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileIndex, isStudentMode, openFiles.length, searchQuery]);

  const startResizing = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsResizing(true);
  };

  const resize = (event: React.MouseEvent) => {
    if (!isResizing) {
      return;
    }
    const nextWidth = document.body.clientWidth - event.clientX;
    if (nextWidth > 280 && nextWidth < document.body.clientWidth - 360) {
      setAiPanelWidth(nextWidth);
    }
  };


  if (authChecking) {
    return <div className="flex h-screen w-screen items-center justify-center bg-[#0e0e11] text-sm text-[#6f7192]">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0e0e11]" onMouseMove={resize} onMouseUp={() => setIsResizing(false)}>
      <TitleBar
        variant={isStudentMode ? 'student' : 'developer'}
        onLogout={handleLogout}
        username={username}
        onNewFile={handleCreateFile}
        onOpenFile={handleOpenFile}
        onOpenFolder={handleOpenFolder}
        onSave={handleFileSave}
        onSaveAs={handleSaveAs}
        onCloseFile={() => openFiles.length > 0 && handleFileClose(activeFileIndex)}
        onUndo={() => dispatchEditorEvent('editor-undo')}
        onRedo={() => dispatchEditorEvent('editor-redo')}
        onCut={() => dispatchEditorEvent('editor-cut')}
        onCopy={() => dispatchEditorEvent('editor-copy')}
        onPaste={() => dispatchEditorEvent('editor-paste')}
        onSelectAll={() => dispatchEditorEvent('editor-select-all')}
        onFind={handleFind}
        onReplace={handleReplace}
        onGoToFile={() => setCommandPaletteOpen(true)}
        onGoToLine={handleGoToLine}
        onSearchInProject={handleSearchInProject}
        onRunCode={handleRunCode}
        onStopExecution={handleStopExecution}
        onRestartExecution={handleRestartExecution}
        onViewOutput={() => setOutputVisible(true)}
        onOpenDocumentation={() => window.electronAPI?.openExternalLink('https://www.electronjs.org/docs/latest')}
        onOpenKeyboardShortcuts={() => setCommandPaletteOpen(true)}
        onReportIssue={() => setSettingsOpen(true)}
        onShowAbout={() => alert(DEFAULT_ABOUT)}
        onOpenSettings={() => setSettingsOpen(true)}
        onCommandPalette={() => setCommandPaletteOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {isStudentMode ? (
          <StudentWorkspace
            studentProfile={settings.studentProfile}
            onAiModeChange={handleAiModeChange}
            onStudentProfileChange={handleStudentProfileChange}
            theme={settings.theme}
          />
        ) : (
          <>
            <ActivityBar activeView={activeView} onViewChange={setActiveView} onOpenSettings={() => setSettingsOpen(true)} />
            <Sidebar
              activeView={activeView}
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              onFileOpen={handleFileOpen}
              rootPath={rootPath}
              fileTree={fileTree}
              onOpenFolder={handleOpenFolder}
              onRefresh={() => refreshFileTree()}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />

            <EditorLayout
              openFiles={openFiles}
              activeFileIndex={activeFileIndex}
              onFileSelect={setActiveFileIndex}
              onFileClose={handleFileClose}
              onContentChange={handleContentChange}
              onSave={handleFileSave}
              settings={settings}
              showAIPanel={showAIPanel}
              aiPanelWidth={aiPanelWidth}
              onStartResize={startResizing}
              onCloseAIPanel={() => setShowAIPanel(false)}
              rootPath={rootPath}
              fileTree={fileTree}
              onApplyCode={handleApplyCode}
              onLivePreview={handleLivePreview}
              activeFile={activeFile}
              outputLines={outputLines}
              outputVisible={outputVisible}
              runState={runStatus}
              onToggleOutput={() => setOutputVisible((current) => !current)}
              onClearOutput={() => setOutputLines([])}
              aiMode={settings.aiMode}
              studentProfile={settings.studentProfile}
              onAiModeChange={handleAiModeChange}
              onStudentProfileChange={handleStudentProfileChange}
            />
          </>
        )}
      </div>

      {!isStudentMode ? <StatusBar activeFile={activeFile} settings={settings} /> : null}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        username={username}
        onLogout={handleLogout}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />

      {!isStudentMode ? (
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onOpenFolder={handleOpenFolder}
          onOpenFile={handleOpenFile}
          onNewFile={handleCreateFile}
          onSave={handleFileSave}
          onToggleSettings={() => setSettingsOpen(true)}
          onRunCode={handleRunCode}
          onGoToLine={handleGoToLine}
          onSearchInProject={handleSearchInProject}
          onViewOutput={() => setOutputVisible(true)}
        />
      ) : null}
    </div>
  );
}
