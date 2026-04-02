import { useEffect, useMemo, useRef } from 'react';
import { Circle, X } from 'lucide-react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeFile = openFiles[activeFileIndex];

  const activeLines = useMemo(() => (activeFile ? activeFile.content.split('\n') : []), [activeFile]);

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
    const textarea = textareaRef.current;
    if (!textarea || !activeFile) {
      return undefined;
    }

    const insertAtSelection = async (text: string, replaceSelection = true) => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextContent = `${activeFile.content.slice(0, start)}${text}${activeFile.content.slice(replaceSelection ? end : start)}`;
      onContentChange(nextContent);
      requestAnimationFrame(() => {
        textarea.focus();
        const caret = start + text.length;
        textarea.setSelectionRange(caret, caret);
      });
    };

    const replaceCurrentSelection = (nextText: string) => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextContent = `${activeFile.content.slice(0, start)}${nextText}${activeFile.content.slice(end)}`;
      onContentChange(nextContent);
      requestAnimationFrame(() => {
        textarea.focus();
        const caret = start + nextText.length;
        textarea.setSelectionRange(caret, caret);
      });
    };

    const selectMatch = (query: string) => {
      const searchFrom = textarea.selectionEnd;
      const haystack = activeFile.content.toLowerCase();
      const needle = query.toLowerCase();
      const firstIndex = haystack.indexOf(needle, searchFrom);
      const index = firstIndex >= 0 ? firstIndex : haystack.indexOf(needle);
      if (index >= 0) {
        textarea.focus();
        textarea.setSelectionRange(index, index + query.length);
      }
    };

    const handleGoToLine = (event: Event) => {
      const detail = (event as CustomEvent<{ line: number }>).detail;
      const lineIndex = Math.min(Math.max(1, detail.line), activeLines.length || 1) - 1;
      const charsBefore = activeLines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
      const targetLine = activeLines[lineIndex] ?? '';
      textarea.focus();
      textarea.setSelectionRange(charsBefore, charsBefore + targetLine.length);
    };

    const handleFind = (event: Event) => {
      const detail = (event as CustomEvent<{ query: string }>).detail;
      if (detail.query) {
        selectMatch(detail.query);
      }
    };

    const handleReplace = (event: Event) => {
      const detail = (event as CustomEvent<{ find: string; replace: string }>).detail;
      if (!detail.find) {
        return;
      }

      const selectedText = activeFile.content.slice(textarea.selectionStart, textarea.selectionEnd);
      if (selectedText === detail.find) {
        replaceCurrentSelection(detail.replace);
        return;
      }

      const nextContent = activeFile.content.split(detail.find).join(detail.replace);
      onContentChange(nextContent);
    };

    const handleUndo = () => document.execCommand('undo');
    const handleRedo = () => document.execCommand('redo');
    const handleSelectAll = () => {
      textarea.focus();
      textarea.select();
    };
    const handleCopy = async () => {
      const text = activeFile.content.slice(textarea.selectionStart, textarea.selectionEnd);
      if (text) {
        await navigator.clipboard.writeText(text);
      }
    };
    const handleCut = async () => {
      const selectedText = activeFile.content.slice(textarea.selectionStart, textarea.selectionEnd);
      if (!selectedText) {
        return;
      }
      await navigator.clipboard.writeText(selectedText);
      replaceCurrentSelection('');
    };
    const handlePaste = async () => {
      const text = await navigator.clipboard.readText();
      if (text) {
        await insertAtSelection(text);
      }
    };

    window.addEventListener('go-to-line', handleGoToLine);
    window.addEventListener('find-in-file', handleFind);
    window.addEventListener('replace-in-file', handleReplace);
    window.addEventListener('editor-undo', handleUndo);
    window.addEventListener('editor-redo', handleRedo);
    window.addEventListener('editor-select-all', handleSelectAll);
    window.addEventListener('editor-copy', handleCopy);
    window.addEventListener('editor-cut', handleCut);
    window.addEventListener('editor-paste', handlePaste);

    return () => {
      window.removeEventListener('go-to-line', handleGoToLine);
      window.removeEventListener('find-in-file', handleFind);
      window.removeEventListener('replace-in-file', handleReplace);
      window.removeEventListener('editor-undo', handleUndo);
      window.removeEventListener('editor-redo', handleRedo);
      window.removeEventListener('editor-select-all', handleSelectAll);
      window.removeEventListener('editor-copy', handleCopy);
      window.removeEventListener('editor-cut', handleCut);
      window.removeEventListener('editor-paste', handlePaste);
    };
  }, [activeFile, activeLines, onContentChange]);

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

  const getBreadcrumbs = (targetPath: string) => targetPath.split(/[\\/]/).slice(Math.max(0, targetPath.split(/[\\/]/).length - 3));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeFile) {
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const tabSize = settings?.tabSize ?? 4;
      const spaces = ' '.repeat(tabSize);
      const textarea = event.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextContent = `${activeFile.content.slice(0, start)}${spaces}${activeFile.content.slice(end)}`;
      onContentChange(nextContent);
      requestAnimationFrame(() => textarea.setSelectionRange(start + tabSize, start + tabSize));
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

      <div className="flex flex-1 overflow-hidden">
        {settings?.lineNumbers !== false && (
          <div className="w-14 overflow-hidden border-r border-[#1e1f28] bg-[#0f1014] py-4 text-right text-xs text-[#5a6075]">
            {activeLines.map((_, index) => (
              <div key={index} className="pr-3 leading-6">
                {index + 1}
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="h-full flex-1 resize-none bg-transparent p-4 text-[#d4d4d4] outline-none"
          style={{
            fontSize: `${settings?.fontSize ?? 14}px`,
            fontFamily: settings?.fontFamily ?? 'Consolas, monospace',
            tabSize: settings?.tabSize ?? 4,
            whiteSpace: settings?.wordWrap ? 'pre-wrap' : 'pre',
            lineHeight: '1.5rem',
          }}
          value={activeFile.content}
          onChange={(event) => onContentChange(event.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
