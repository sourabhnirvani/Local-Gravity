import { BrainCircuit, Check, Copy, ExternalLink, FilePlus, GraduationCap, Loader2, Sparkles, Trash2, User } from 'lucide-react';
import { ChatMessage, ChatMode, OpenFile, WebsiteGenerationMeta } from '../types';

interface GeneratedFile {
  path: string;
  content: string;
}

interface AIMessageListProps {
  aiMode: ChatMode;
  messages: ChatMessage[];
  copied: string | null;
  activeFile?: OpenFile;
  rootPath?: string | null;
  onApply: (path: string, content: string) => Promise<void> | void;
  onCopy: (text: string, id: string) => void;
  websiteMetaByMessage?: Record<string, WebsiteGenerationMeta>;
}

function normalizeGeneratedPath(targetPath: string, activeFile?: OpenFile, rootPath?: string | null) {
  if (/^[a-zA-Z]:[/\\]/.test(targetPath) || targetPath.startsWith('/')) {
    return targetPath;
  }

  if (rootPath) {
    return `${rootPath.replace(/[/\\]$/, '')}/${targetPath.replace(/^[/\\]+/, '')}`;
  }

  if (activeFile?.path) {
    return activeFile.path.replace(/[\\/][^\\/]+$/, `/${targetPath.replace(/^[/\\]+/, '')}`);
  }

  return targetPath;
}

function inferEntryFile(generatedFiles: GeneratedFile[]) {
  const normalized = generatedFiles.map((file) => ({
    ...file,
    normalizedPath: file.path.replace(/\\/g, '/'),
  }));

  const indexFile = normalized.find((file) => /(?:^|\/)index\.html$/i.test(file.normalizedPath));
  if (indexFile) {
    return indexFile.path;
  }

  const anyHtml = normalized.find((file) => /\.html$/i.test(file.normalizedPath));
  return anyHtml?.path;
}

export default function AIMessageList({
  aiMode,
  messages,
  copied,
  activeFile,
  rootPath,
  onApply,
  onCopy,
  websiteMetaByMessage = {},
}: AIMessageListProps) {
  const isStudentMode = aiMode === 'student';

  const formatMessage = (content: string, messageId: string) => {
    const thoughtRegex = /<thought>([\s\S]*?)(?:<\/thought>|(?=```)|$)/;
    const thoughtMatch = content.match(thoughtRegex);
    let thoughtContent = '';
    let cleanContent = content;
    const isThinking = content.includes('<thought>') && !content.includes('</thought>') && !content.includes('```');

    if (thoughtMatch) {
      thoughtContent = thoughtMatch[1].trim();
      cleanContent = content.replace(thoughtRegex, '').trim();
    }

    const parts = cleanContent.split(/(```[\s\S]*?(?:```|$))/g);

    const renderedParts = parts.map((part, index) => {
      if (!part.startsWith('```')) {
        return <span key={index} className="min-w-0 whitespace-pre-wrap break-words">{part}</span>;
      }

      let codeContent = part.replace(/```\w*\n?/g, '').replace(/```$/g, '');
      const language = part.match(/```(\w*)/)?.[1] || '';
      const blockId = `${messageId}-${index}`;
      let fileMarkerMatch = codeContent.match(/^\/\/ FILE: (.+)(\r?\n|$)/);

      if (!fileMarkerMatch && index > 0) {
        const prevPart = parts[index - 1];
        const matches = [...prevPart.matchAll(/\/\/ FILE: ([^\n]+)/g)];
        if (matches.length > 0) {
          const lastMatch = matches[matches.length - 1];
          fileMarkerMatch = [lastMatch[0], lastMatch[1]] as unknown as RegExpMatchArray;
        }
      }

      let targetPath = null;
      let displayPath = '';

      if (!isStudentMode && fileMarkerMatch) {
        targetPath = fileMarkerMatch[1].trim().replace(/[.:]$/, '');
        displayPath = targetPath.split(/[\\/]/).pop() || targetPath;
      } else if (!isStudentMode && activeFile) {
        targetPath = activeFile.path;
        displayPath = activeFile.name;
      }

      const deleteMatch = part.match(/^DELETE: (.+)(\r?\n|$)/);
      if (deleteMatch) {
        const deletePath = deleteMatch[1].trim();
        const deleteName = deletePath.split(/[\\/]/).pop() || deletePath;
        return (
          <div key={index} className="my-2 flex items-center justify-between rounded-md border border-[#ff4444] bg-[#2d2d2d] p-3 text-sm">
            <span className="text-[#ff9999]">Delete <strong>{deleteName}</strong>?</span>
            <button
              onClick={async () => {
                if (confirm(`Are you sure you want to delete ${deleteName}?`)) {
                  await window.fileSystem?.deleteFile(deletePath);
                  alert(`Deleted ${deletePath}`);
                }
              }}
              className="flex items-center gap-1 rounded bg-[#cc0000] px-3 py-1 text-white transition-colors hover:bg-[#ff0000]"
            >
              <Trash2 size={12} />
              Confirm Delete
            </button>
          </div>
        );
      }

      return (
        <div key={index} className="my-2 overflow-hidden rounded-md border border-[#3c3c3c] bg-[#1e1e1e]">
          <div className="flex items-center justify-between bg-[#2d2d2d] px-3 py-1 text-xs text-[#858585]">
            <div className="flex items-center gap-2 overflow-hidden">
              <span>{language || 'code'}</span>
              {targetPath ? (
                <span className="max-w-[200px] truncate text-[#007acc]" title={targetPath}>
                  {displayPath}
                </span>
              ) : null}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {targetPath ? (
                <button
                  onClick={() => onApply(targetPath!, codeContent)}
                  className="flex items-center gap-1 rounded bg-[#0e639c] px-2 py-0.5 text-white transition-colors hover:bg-[#1177bb]"
                  title={`Write to ${targetPath}`}
                >
                  <FilePlus size={12} fill="currentColor" />
                  Apply
                </button>
              ) : null}
              <button
                onClick={() => onCopy(codeContent, blockId)}
                className="flex items-center gap-1 rounded px-2 py-0.5 transition-colors hover:bg-[#3c3c3c] hover:text-white"
              >
                {copied === blockId ? <Check size={12} /> : <Copy size={12} />}
                {copied === blockId ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <pre className="overflow-x-auto p-3 text-sm">
            <code className="text-[#d4d4d4]">{codeContent}</code>
          </pre>
        </div>
      );
    });

    return (
      <div className="flex flex-col gap-2">
        {thoughtContent ? (
          <details open={isThinking} className="cursor-pointer overflow-hidden rounded-md border border-[#3c3c3c] bg-[#2d2d2d] opacity-90 transition-all">
            <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-semibold text-[#858585] transition-colors hover:text-[#cccccc] outline-none">
              <BrainCircuit size={14} className={isThinking ? 'animate-pulse text-[#007acc]' : 'text-[#007acc]'} />
              {isThinking ? (
                <span className="flex items-center gap-2">Thinking <Loader2 size={12} className="animate-spin text-[#007acc]" /></span>
              ) : (
                'Thought Process'
              )}
            </summary>
            <div className="max-h-[400px] overflow-y-auto border-t border-[#3c3c3c] bg-[#1e1e1e]/50 px-3 py-2 text-xs italic text-[#a0a0a0] whitespace-pre-wrap">
              {thoughtContent}
            </div>
          </details>
        ) : null}
        <div>{renderedParts}</div>
      </div>
    );
  };

  const getGeneratedFiles = (message: ChatMessage): GeneratedFile[] => {
    if (isStudentMode) {
      return [];
    }

    const parts = message.content.split(/(```[\s\S]*?```)/g);
    const generatedFiles: GeneratedFile[] = [];

    parts.forEach((part, index) => {
      if (!part.startsWith('```')) {
        return;
      }

      const codeContent = part.replace(/```\w*\n?/g, '').replace(/```$/g, '');
      let fileMarkerMatch = codeContent.match(/^\/\/ FILE: (.+)(\r?\n|$)/);

      if (!fileMarkerMatch && index > 0) {
        const prevPart = parts[index - 1];
        const matches = [...prevPart.matchAll(/\/\/ FILE: ([^\n]+)/g)];
        if (matches.length > 0) {
          const lastMatch = matches[matches.length - 1];
          fileMarkerMatch = [lastMatch[0], lastMatch[1]] as unknown as RegExpMatchArray;
        }
      }

      let targetPath = null;
      if (fileMarkerMatch) {
        targetPath = fileMarkerMatch[1].trim().replace(/[.:]$/, '');
      } else if (activeFile) {
        targetPath = activeFile.path;
      }

      if (targetPath) {
        generatedFiles.push({ path: normalizeGeneratedPath(targetPath, activeFile, rootPath), content: codeContent });
      }
    });

    return generatedFiles;
  };

  return (
    <div className={`flex-1 overflow-y-auto p-3 space-y-4 ${isStudentMode ? 'bg-[linear-gradient(180deg,#fffdf7,#fff7dc)]' : 'bg-transparent'}`}>
      {messages.map((message) => {
        const generatedFiles = getGeneratedFiles(message);
        const websiteMeta = websiteMetaByMessage[message.id];
        const entryFilePath = websiteMeta?.entryFilePath ?? inferEntryFile(generatedFiles);
        const shouldOpenSite = Boolean(websiteMeta?.isWebsiteRequest && entryFilePath);
        const autoApplied = Boolean(websiteMeta?.autoApplied);

        return (
          <div key={message.id} className="flex gap-3">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
              message.role === 'user'
                ? isStudentMode
                  ? 'bg-[#f2de9f] text-[#6d4a08]'
                  : 'bg-[#3c3c3c] text-[#cccccc]'
                : isStudentMode
                  ? 'bg-[#d78928] text-white'
                  : 'bg-[#007acc] text-white'
            }`}>
              {message.role === 'user' ? <User size={14} /> : isStudentMode ? <GraduationCap size={14} /> : <Sparkles size={14} />}
            </div>

            <div className={`min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm ${
              isStudentMode
                ? message.role === 'user'
                  ? 'bg-[#fff4d5] text-[#5a3907]'
                  : 'bg-white text-[#4a2f05] shadow-sm ring-1 ring-[#f1e1aa]'
                : 'text-[#cccccc]'
            }`}>
              <div className={`mb-1 text-xs font-medium ${isStudentMode ? 'text-[#8b6d2d]' : 'text-[#858585]'}`}>
                {message.role === 'user' ? 'You' : isStudentMode ? 'Study Buddy' : 'AI Assistant'}
              </div>
              <div>{formatMessage(message.content, message.id)}</div>

              {generatedFiles.length > 1 ? (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={async () => {
                      if (!autoApplied) {
                        for (const file of generatedFiles) {
                          await onApply(file.path, file.content);
                        }
                      }

                      if (shouldOpenSite && entryFilePath) {
                        try {
                          await window.electronAPI?.openLocalFile(entryFilePath);
                        } catch (error) {
                          alert(error instanceof Error ? error.message : 'Unable to open generated site');
                        }
                      }
                    }}
                    className="flex items-center gap-1.5 rounded border border-[#007acc]/50 bg-[#007acc] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#0062a3]"
                    title={
                      shouldOpenSite
                        ? autoApplied
                          ? 'Open the saved website again in your browser'
                          : 'Apply all website files and open the site in your browser'
                        : 'Apply all code blocks to the editor instantly'
                    }
                  >
                    {shouldOpenSite ? <ExternalLink size={14} /> : <FilePlus size={14} />}
                    {shouldOpenSite ? (autoApplied ? 'Open Site Again' : 'Apply and Open Site') : `Apply All ${generatedFiles.length} Files`}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
