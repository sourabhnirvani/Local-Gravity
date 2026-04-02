import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  File,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  MinusSquare,
  RefreshCw,
  Search,
} from 'lucide-react';
import { ViewType } from '../App';
import { FileNode } from '../types';

interface SidebarProps {
  activeView: ViewType;
  width: number;
  onWidthChange: (width: number) => void;
  onFileOpen?: (filePath: string) => void;
  rootPath: string | null;
  fileTree: FileNode[];
  onOpenFolder: () => void;
  onRefresh?: () => void;
  onCreateFile?: () => void;
  onCreateFolder?: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

function flattenFiles(nodes: FileNode[]): FileNode[] {
  return nodes.flatMap((node) => {
    if (node.type === 'directory') {
      return flattenFiles(node.children ?? []);
    }
    return [node];
  });
}

export default function Sidebar({
  activeView,
  width,
  onFileOpen,
  rootPath,
  fileTree,
  onOpenFolder,
  onRefresh,
  onCreateFile,
  onCreateFolder,
  searchQuery,
  onSearchQueryChange,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    return flattenFiles(fileTree).filter((node) => node.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [fileTree, searchQuery]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const handleCollapseAll = () => {
    setExpandedFolders(new Set());
  };

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'directory') {
      toggleFolder(node.path);
      return;
    }

    onFileOpen?.(node.path);
  };

  const getFileIcon = (extension?: string) => {
    const colorMap: Record<string, string> = {
      ts: '#2b7489',
      tsx: '#2b7489',
      js: '#f1e05a',
      jsx: '#f1e05a',
      json: '#f1e05a',
      html: '#e34c26',
      css: '#563d7c',
      md: '#083fa1',
      py: '#3572A5',
      java: '#b07219',
    };
    return colorMap[extension ?? ''] ?? '#519aba';
  };

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => (
      <div key={node.path}>
        <div
          className="tree-item"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => handleFileClick(node)}
        >
          {node.type === 'directory' ? (
            <>
              {expandedFolders.has(node.path) ? (
                <ChevronDown size={16} className="text-[#858585]" />
              ) : (
                <ChevronRight size={16} className="text-[#858585]" />
              )}
              {expandedFolders.has(node.path) ? (
                <FolderOpen size={16} className="text-[#dcb67a]" />
              ) : (
                <Folder size={16} className="text-[#dcb67a]" />
              )}
            </>
          ) : (
            <>
              <span className="w-4" />
              <File size={16} style={{ color: getFileIcon(node.extension) }} />
            </>
          )}
          <span className="truncate text-sm text-[#cccccc]">{node.name}</span>
        </div>
        {node.type === 'directory' && expandedFolders.has(node.path) && node.children && renderTree(node.children, depth + 1)}
      </div>
    ));

  const getFolderName = (targetPath: string | null) => {
    if (!targetPath) {
      return 'NO FOLDER OPENED';
    }
    return targetPath.split('\\').pop()?.toUpperCase() || 'FOLDER';
  };

  return (
    <div className="flex flex-col overflow-hidden border-r border-[#2a2a32] bg-[#1a1a1f]" style={{ width }}>
      <div className="group flex h-9 items-center justify-between px-4 text-xs font-medium uppercase tracking-wide text-[#bbbbbb]">
        <span>
          {activeView === 'explorer' && 'Explorer'}
          {activeView === 'search' && 'Search'}
          {activeView === 'git' && 'Source Control'}
          {activeView === 'ai' && 'AI Assistant'}
        </span>

        {activeView === 'explorer' && rootPath && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={onCreateFile} className="rounded p-1 text-[#cccccc] hover:bg-[#2a2a32]" title="New File">
              <FilePlus size={14} />
            </button>
            <button onClick={onCreateFolder} className="rounded p-1 text-[#cccccc] hover:bg-[#2a2a32]" title="New Folder">
              <FolderPlus size={14} />
            </button>
            <button onClick={onRefresh} className="rounded p-1 text-[#cccccc] hover:bg-[#2a2a32]" title="Refresh">
              <RefreshCw size={14} />
            </button>
            <button onClick={handleCollapseAll} className="rounded p-1 text-[#cccccc] hover:bg-[#2a2a32]" title="Collapse All">
              <MinusSquare size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeView === 'explorer' && (
          <div>
            {!rootPath && (
              <div className="p-4">
                <button
                  onClick={onOpenFolder}
                  className="flex w-full items-center justify-center gap-2 rounded bg-[#3b82f6] px-4 py-2 text-sm text-white hover:bg-[#2563eb]"
                >
                  <FolderPlus size={16} />
                  Open Folder
                </button>
              </div>
            )}

            {rootPath && (
              <div className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs font-medium text-[#cccccc] hover:bg-[#2a2a32]" onClick={onOpenFolder}>
                <ChevronDown size={16} />
                <span>{getFolderName(rootPath)}</span>
              </div>
            )}

            {fileTree.length > 0 && renderTree(fileTree)}

            {rootPath && fileTree.length === 0 && <div className="p-4 text-sm text-[#858585]">No files found in this folder</div>}
          </div>
        )}

        {activeView === 'search' && (
          <div className="p-3">
            <div className="mb-3 flex items-center gap-2 rounded border border-[#2a2a32] bg-[#0e0e11] px-3 py-2">
              <Search size={15} className="text-[#6f7192]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Search files in project"
                className="w-full bg-transparent text-sm text-[#cccccc] outline-none placeholder:text-[#555577]"
              />
            </div>

            {searchQuery.trim() === '' ? (
              <p className="text-sm text-[#6f7192]">Type to search by file name across the current project.</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-[#6f7192]">No matching files found.</p>
            ) : (
              <div className="space-y-1">
                {searchResults.map((node) => (
                  <button
                    key={node.path}
                    onClick={() => onFileOpen?.(node.path)}
                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-[#2a2a32]"
                  >
                    <File size={14} style={{ color: getFileIcon(node.extension) }} />
                    <div className="min-w-0">
                      <div className="truncate text-sm text-[#cccccc]">{node.name}</div>
                      <div className="truncate text-xs text-[#6f7192]">{node.path}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'git' && <div className="p-4 text-sm text-[#858585]">Source control UI is ready for Git integration.</div>}

        {activeView === 'ai' && (
          <div className="p-4 text-sm text-[#cccccc]">
            <p className="mb-3">AI Assistant is available in the right panel.</p>
            <p className="text-xs text-[#6f7192]">Use Ctrl + Shift + P for quick commands or open Settings for feedback.</p>
          </div>
        )}
      </div>
    </div>
  );
}
