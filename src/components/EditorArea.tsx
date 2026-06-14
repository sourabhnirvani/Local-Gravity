import { useEffect, useRef } from 'react';
import { Circle, X } from 'lucide-react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { OpenFile } from '../types';
import { AppSettings } from '../services/settingsService';

interface EditorAreaProps {
  openFiles: OpenFile[];
  activeFileIndex: number;
  onFileSelect: (index: number) => void;
  onFileClose: (index: number) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  settings?: AppSettings;
}

export default function EditorArea({
  openFiles,
  activeFileIndex,
  onFileSelect,
  onFileClose,
  onContentChange,
  onSave,
  settings,
}: EditorAreaProps) {
  const editorRef = useRef<any>(null);
  const monaco = useMonaco();
  const activeFile = openFiles[activeFileIndex];

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [onSave]);

  useEffect(() => {
    if (!editorRef.current) return;

    const handleGoToLine = (event: Event) => {
      const detail = (event as CustomEvent<{ line: number }>).detail;
      editorRef.current?.setPosition({ lineNumber: detail.line, column: 1 });
      editorRef.current?.revealLine(detail.line);
      editorRef.current?.focus();
    };

    const handleFind = (event: Event) => {
      const detail = (event as CustomEvent<{ query: string }>).detail;
      if (detail.query) {
        editorRef.current?.getAction('actions.find').run();
      }
    };

    const handleUndo = () => editorRef.current?.trigger('keyboard', 'undo', null);
    const handleRedo = () => editorRef.current?.trigger('keyboard', 'redo', null);
    const handleSelectAll = () => editorRef.current?.setSelection(editorRef.current?.getModel().getFullModelRange());
    
    window.addEventListener('go-to-line', handleGoToLine);
    window.addEventListener('find-in-file', handleFind);
    window.addEventListener('editor-undo', handleUndo);
    window.addEventListener('editor-redo', handleRedo);
    window.addEventListener('editor-select-all', handleSelectAll);

    return () => {
      window.removeEventListener('go-to-line', handleGoToLine);
      window.removeEventListener('find-in-file', handleFind);
      window.removeEventListener('editor-undo', handleUndo);
      window.removeEventListener('editor-redo', handleRedo);
      window.removeEventListener('editor-select-all', handleSelectAll);
    };
  }, [activeFile]);

  // Setup custom theme once monaco is loaded
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('localgravity-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#0f1014',
          'editor.lineHighlightBackground': '#1a1b24',
          'editorLineNumber.foreground': '#5a6075',
        }
      });
      monaco.editor.setTheme('localgravity-dark');
    }
  }, [monaco]);

  const handleTabClose = (event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    onFileClose(index);
  };

  const getFileIconColor = (extension: string) => {
    const map: Record<string, string> = {
      ts: '#2b7489',
      tsx: '#2b7489',
      js: '#f1e05a',
      jsx: '#f1e05a',
      json: '#f1e05a',
      html: '#e34c26',
      css: '#563d7c',
      md: '#083fa1',
      py: '#3572A5',
    };
    return map[extension] ?? '#519aba';
  };

  const getBreadcrumbs = (targetPath: string) => 
    targetPath.split(/[\\/]/).slice(Math.max(0, targetPath.split(/[\\/]/).length - 3));

  const getMonacoLanguage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx': return 'typescript';
      case 'js':
      case 'jsx': return 'javascript';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'py': return 'python';
      case 'java': return 'java';
      default: return 'plaintext';
    }
  };

  if (!activeFile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#111318] text-[#6f7192] select-none">
        <div className="mb-4 text-4xl opacity-20">&lt;/&gt;</div>
        <p className="text-sm">No files open</p>
        <p className="mt-1 text-xs text-[#4a4d63]">Open a file or folder to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#111318]">
      <div className="flex h-9 items-center overflow-x-auto border-b border-[#1e1f28] bg-[#1a1a1f]">
        {openFiles.map((file, index) => (
          <div
            key={file.path}
            className={`tab ${index === activeFileIndex ? 'active' : ''}`}
            onClick={() => onFileSelect(index)}
          >
            <Circle size={8} style={{ color: getFileIconColor(file.name.split('.').pop() ?? '') }} fill="currentColor" />
            <span>{file.name}</span>
            {file.isDirty && <Circle size={6} className="text-white opacity-60" fill="currentColor" />}
            <button className="tab-close" onClick={(event) => handleTabClose(event, index)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="breadcrumb">
        {getBreadcrumbs(activeFile.path).map((part, index, parts) => (
          <span key={`${part}-${index}`}>
            <span className="breadcrumb-item cursor-pointer hover:underline">{part}</span>
            {index < parts.length - 1 && <span className="mx-1 text-[#3c3c4c]">/</span>}
          </span>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <Editor
          height="100%"
          language={getMonacoLanguage(activeFile.name)}
          theme="localgravity-dark"
          value={activeFile.content}
          onChange={(value) => onContentChange(value || '')}
          onMount={(editor) => { editorRef.current = editor; }}
          options={{
            fontSize: settings?.fontSize ?? 14,
            fontFamily: settings?.fontFamily ?? 'Consolas, monospace',
            tabSize: settings?.tabSize ?? 4,
            wordWrap: settings?.wordWrap ? 'on' : 'off',
            lineNumbers: settings?.lineNumbers !== false ? 'on' : 'off',
            minimap: { enabled: true, scale: 0.75 },
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            formatOnPaste: true,
          }}
          loading={
            <div className="flex items-center justify-center h-full w-full text-[#6f7192] text-sm">
              Loading Editor...
            </div>
          }
        />
      </div>
    </div>
  );
}
