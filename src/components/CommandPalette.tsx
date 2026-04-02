import { useEffect, useMemo, useRef, useState } from 'react';
import { File, FolderOpen, LucideIcon, Play, Search, Settings, TerminalSquare, Zap } from 'lucide-react';

interface Command {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  icon: LucideIcon;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFolder: () => void;
  onOpenFile: () => void;
  onNewFile: () => void;
  onSave: () => void;
  onToggleSettings: () => void;
  onRunCode: () => void;
  onGoToLine: () => void;
  onSearchInProject: () => void;
  onViewOutput: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onOpenFolder,
  onOpenFile,
  onNewFile,
  onSave,
  onToggleSettings,
  onRunCode,
  onGoToLine,
  onSearchInProject,
  onViewOutput,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'open-folder',
        label: 'Open Folder',
        description: 'Open a project folder',
        shortcut: 'Ctrl+Shift+O',
        icon: FolderOpen,
        action: () => {
          onOpenFolder();
          onClose();
        },
      },
      {
        id: 'open-file',
        label: 'Open File',
        description: 'Open a file inside the current workspace',
        shortcut: 'Ctrl+O',
        icon: File,
        action: () => {
          onOpenFile();
          onClose();
        },
      },
      {
        id: 'new-file',
        label: 'New File',
        description: 'Create a file in the current workspace',
        shortcut: 'Ctrl+N',
        icon: File,
        action: () => {
          onNewFile();
          onClose();
        },
      },
      {
        id: 'save-file',
        label: 'Save File',
        description: 'Save the current file',
        shortcut: 'Ctrl+S',
        icon: File,
        action: () => {
          onSave();
          onClose();
        },
      },
      {
        id: 'open-settings',
        label: 'Toggle Settings',
        description: 'Open the settings modal',
        shortcut: 'Ctrl+,',
        icon: Settings,
        action: () => {
          onToggleSettings();
          onClose();
        },
      },
      {
        id: 'run-code',
        label: 'Run Code',
        description: 'Run the active file',
        shortcut: 'F5',
        icon: Play,
        action: () => {
          onRunCode();
          onClose();
        },
      },
      {
        id: 'go-to-line',
        label: 'Go to Line',
        description: 'Jump to a specific line number',
        shortcut: 'Ctrl+G',
        icon: Zap,
        action: () => {
          onGoToLine();
          onClose();
        },
      },
      {
        id: 'search-project',
        label: 'Search in Project',
        description: 'Search file names in the current project',
        shortcut: 'Ctrl+Shift+F',
        icon: Search,
        action: () => {
          onSearchInProject();
          onClose();
        },
      },
      {
        id: 'view-output',
        label: 'View Output',
        description: 'Open the output panel',
        shortcut: 'Ctrl+`',
        icon: TerminalSquare,
        action: () => {
          onViewOutput();
          onClose();
        },
      },
    ],
    [onClose, onGoToLine, onNewFile, onOpenFile, onOpenFolder, onRunCode, onSave, onSearchInProject, onToggleSettings, onViewOutput]
  );

  const filteredCommands = query.trim()
    ? commands.filter(
        (command) =>
          command.label.toLowerCase().includes(query.toLowerCase()) ||
          command.description.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(current + 1, filteredCommands.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      filteredCommands[selectedIndex]?.action();
    }
    if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative mx-4 w-full max-w-[620px] overflow-hidden rounded-xl border border-[#2a2a32] bg-[#15171d] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[#2a2a32] px-4 py-3">
          <Search size={16} className="text-[#858585]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command"
            className="flex-1 bg-transparent text-sm text-[#cccccc] outline-none placeholder:text-[#555577]"
          />
          <kbd className="rounded border border-[#2a2a32] px-1.5 py-0.5 text-[10px] text-[#555577]">ESC</kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#6f7192]">No commands found for &quot;{query}&quot;</div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                onClick={command.action}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  index === selectedIndex ? 'bg-[#212633] text-white' : 'text-[#cccccc] hover:bg-[#1b1f2a]'
                }`}
              >
                <command.icon size={15} className={index === selectedIndex ? 'text-[#7c9ef5]' : 'text-[#555577]'} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{command.label}</div>
                  <div className="truncate text-xs text-[#6f7192]">{command.description}</div>
                </div>
                {command.shortcut && <kbd className="rounded border border-[#2a2a32] px-1.5 py-0.5 text-[10px] text-[#555577]">{command.shortcut}</kbd>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
