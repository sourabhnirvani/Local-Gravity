import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, LogOut, Minus, Settings, Square, X } from 'lucide-react';

interface MenuItemDef {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

interface MenuDef {
  label: string;
  items: MenuItemDef[];
}

interface TitleBarProps {
  variant?: 'developer' | 'student';
  onLogout?: () => void;
  username?: string | null;
  onNewFile?: () => void;
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onCloseFile?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
  onGoToFile?: () => void;
  onGoToLine?: () => void;
  onSearchInProject?: () => void;
  onRunCode?: () => void;
  onStopExecution?: () => void;
  onRestartExecution?: () => void;
  onViewOutput?: () => void;
  onOpenDocumentation?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onReportIssue?: () => void;
  onShowAbout?: () => void;
  onOpenSettings?: () => void;
  onCommandPalette?: () => void;
}

export default function TitleBar({
  variant = 'developer',
  onLogout,
  username,
  onNewFile,
  onOpenFile,
  onOpenFolder,
  onSave,
  onSaveAs,
  onCloseFile,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onSelectAll,
  onFind,
  onReplace,
  onGoToFile,
  onGoToLine,
  onSearchInProject,
  onRunCode,
  onStopExecution,
  onRestartExecution,
  onViewOutput,
  onOpenDocumentation,
  onOpenKeyboardShortcuts,
  onReportIssue,
  onShowAbout,
  onOpenSettings,
  onCommandPalette,
}: TitleBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const isStudentVariant = variant === 'student';

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', action: onNewFile },
        { label: 'Open File', shortcut: 'Ctrl+O', action: onOpenFile },
        { label: 'Open Folder', shortcut: 'Ctrl+Shift+O', action: onOpenFolder },
        { separator: true, label: '' },
        { label: 'Save', shortcut: 'Ctrl+S', action: onSave },
        { label: 'Save As', shortcut: 'Ctrl+Shift+S', action: onSaveAs },
        { separator: true, label: '' },
        { label: 'Close File', shortcut: 'Ctrl+W', action: onCloseFile },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: onUndo },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: onRedo },
        { separator: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: onCut },
        { label: 'Copy', shortcut: 'Ctrl+C', action: onCopy },
        { label: 'Paste', shortcut: 'Ctrl+V', action: onPaste },
        { label: 'Select All', shortcut: 'Ctrl+A', action: onSelectAll },
        { separator: true, label: '' },
        { label: 'Find', shortcut: 'Ctrl+F', action: onFind },
        { label: 'Replace', shortcut: 'Ctrl+H', action: onReplace },
      ],
    },
    {
      label: 'Go',
      items: [
        { label: 'Go to File', shortcut: 'Ctrl+P', action: onGoToFile },
        { label: 'Go to Line', shortcut: 'Ctrl+G', action: onGoToLine },
        { label: 'Search in Project', shortcut: 'Ctrl+Shift+F', action: onSearchInProject },
      ],
    },
    {
      label: 'Run',
      items: [
        { label: 'Run Code', shortcut: 'F5', action: onRunCode },
        { label: 'Stop Execution', shortcut: 'Shift+F5', action: onStopExecution },
        { label: 'Restart', shortcut: 'Ctrl+F5', action: onRestartExecution },
        { label: 'View Output', shortcut: 'Ctrl+`', action: onViewOutput },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', action: onOpenDocumentation },
        { label: 'Keyboard Shortcuts', action: onOpenKeyboardShortcuts ?? onCommandPalette },
        { label: 'Report Issue', action: onReportIssue },
        { separator: true, label: '' },
        { label: 'About Application', action: onShowAbout },
      ],
    },
  ];

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleItemClick = (item: MenuItemDef) => {
    if (item.disabled || item.separator) {
      return;
    }

    item.action?.();
    setOpenMenu(null);
  };

  return (
    <div className="drag-region relative z-50 flex h-[35px] w-full shrink-0 items-center justify-between border-b border-[#2a2a32] bg-[#1a1a1f] select-none">
      <div ref={menuBarRef} className="no-drag flex h-full items-center">
        <div className="flex h-full w-[45px] items-center justify-center text-[#3b82f6] transition-colors hover:bg-[#2a2a32]">
          <LayoutGrid size={16} />
        </div>

        {isStudentVariant ? (
          <div className="px-3 text-[13px] text-[#c9b27a]">Student Workspace</div>
        ) : (
          menus.map((menu) => (
            <div key={menu.label} className="relative h-full">
              <button
                className={`flex h-full items-center px-3 text-[13px] transition-colors ${
                  openMenu === menu.label ? 'bg-[#2a2a32] text-white' : 'text-gray-300 hover:bg-[#2a2a32] hover:text-white'
                }`}
                onClick={() => setOpenMenu((current) => (current === menu.label ? null : menu.label))}
                onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
              >
                {menu.label}
              </button>

              {openMenu === menu.label && (
                <div className="absolute left-0 top-full z-[200] min-w-[240px] rounded-b-md border border-[#2a2a32] bg-[#252530] py-1 shadow-2xl">
                  {menu.items.map((item, index) =>
                    item.separator ? (
                      <div key={`${menu.label}-separator-${index}`} className="my-1 border-t border-[#2a2a32]" />
                    ) : (
                      <button
                        key={`${menu.label}-${item.label}`}
                        onClick={() => handleItemClick(item)}
                        disabled={item.disabled}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] transition-colors ${
                          item.disabled ? 'cursor-not-allowed text-[#555577]' : 'text-[#cccccc] hover:bg-[#3b82f6] hover:text-white'
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.shortcut && <span className="ml-8 text-[11px] text-[#555577]">{item.shortcut}</span>}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs text-[#6f7192]">
        {isStudentVariant ? `LocalGravity Student${username ? ` - ${username}` : ''}` : `LocalGravity ${username ? `- ${username}` : ''}`}
      </div>

      <div className="no-drag flex h-full items-center">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex h-full w-[36px] items-center justify-center text-[#858585] transition-colors hover:bg-[#2a2a32] hover:text-white"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        )}
        {username && onLogout && (
          <button
            onClick={onLogout}
            className="flex h-full items-center gap-1.5 px-3 text-xs text-[#858585] transition-colors hover:bg-[#2a2a32] hover:text-white"
            title="Sign Out"
          >
            <LogOut size={13} />
          </button>
        )}
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="flex h-full w-[46px] items-center justify-center text-[#858585] transition-colors hover:bg-[#2a2a32] hover:text-white"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          className="flex h-full w-[46px] items-center justify-center text-[#858585] transition-colors hover:bg-[#2a2a32] hover:text-white"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => window.electronAPI?.close()}
          className="flex h-full w-[46px] items-center justify-center text-[#858585] transition-colors hover:bg-[#e81123] hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
