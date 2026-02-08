import { ChevronDown, ChevronRight, File, Folder, FolderOpen, FolderPlus, FilePlus, RefreshCw, MinusSquare } from 'lucide-react';
import { ViewType } from '../App';
import { useState } from 'react';
import { FileNode } from '../types';

interface SidebarProps {
    activeView: ViewType;
    width: number;
    onWidthChange: (width: number) => void;
    onFileOpen?: (filePath: string) => void;
    // New props for lifted state
    rootPath: string | null;
    fileTree: FileNode[];
    onOpenFolder: () => void;
    onRefresh?: () => void;
    onCreateFile?: () => void;
    onCreateFolder?: () => void;
}

function Sidebar({ activeView, width, onFileOpen, rootPath, fileTree, onOpenFolder, onRefresh, onCreateFile, onCreateFolder }: SidebarProps) {
    // expandedFolders is UI state, can stay here
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const toggleFolder = (folderPath: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderPath)) {
            newExpanded.delete(folderPath);
        } else {
            newExpanded.add(folderPath);
        }
        setExpandedFolders(newExpanded);
    };

    const handleCollapseAll = () => {
        setExpandedFolders(new Set());
    };

    const handleFileClick = (node: FileNode) => {
        if (node.type === 'directory') {
            toggleFolder(node.path);
        } else {
            onFileOpen?.(node.path);
        }
    };

    const getFileIcon = (extension?: string) => {
        // Return color based on file extension
        const colorMap: Record<string, string> = {
            'ts': '#2b7489',
            'tsx': '#2b7489',
            'js': '#f1e05a',
            'jsx': '#f1e05a',
            'json': '#f1e05a',
            'html': '#e34c26',
            'css': '#563d7c',
            'md': '#083fa1',
            'py': '#3572A5',
            'java': '#b07219',
        };
        return colorMap[extension || ''] || '#519aba';
    };

    const renderTree = (nodes: FileNode[], depth = 0) => {
        return nodes.map((node) => (
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
                    <span className="text-[#cccccc] text-sm">{node.name}</span>
                </div>
                {node.type === 'directory' && expandedFolders.has(node.path) && node.children && (
                    renderTree(node.children, depth + 1)
                )}
            </div>
        ));
    };

    const getFolderName = (path: string | null) => {
        if (!path) return 'NO FOLDER OPENED';
        return path.split('\\').pop()?.toUpperCase() || 'FOLDER';
    };

    return (
        <div
            className="bg-[#252526] border-r border-[#3c3c3c] flex flex-col overflow-hidden"
            style={{ width }}
        >
            {/* Header */}
            <div className="h-9 flex items-center justify-between px-4 text-xs text-[#bbbbbb] uppercase tracking-wide font-medium group">
                {/* Title */}
                <span>
                    {activeView === 'explorer' && 'Explorer'}
                    {activeView === 'search' && 'Search'}
                    {activeView === 'git' && 'Source Control'}
                    {activeView === 'ai' && 'AI Assistant'}
                </span>

                {/* Actions Toolbar (Only for Explorer) */}
                {activeView === 'explorer' && rootPath && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onCreateFile} className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc]" title="New File">
                            <FilePlus size={14} />
                        </button>
                        <button onClick={onCreateFolder} className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc]" title="New Folder">
                            <FolderPlus size={14} />
                        </button>
                        <button onClick={onRefresh} className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc]" title="Refresh">
                            <RefreshCw size={14} />
                        </button>
                        <button onClick={handleCollapseAll} className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc]" title="Collapse All">
                            <MinusSquare size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeView === 'explorer' && (
                    <div>
                        {/* Open Folder Button */}
                        {!rootPath && (
                            <div className="p-4">
                                <button
                                    onClick={onOpenFolder}
                                    className="w-full bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm py-2 px-4 rounded flex items-center justify-center gap-2"
                                >
                                    <FolderPlus size={16} />
                                    Open Folder
                                </button>
                            </div>
                        )}

                        {/* Project Header */}
                        {rootPath && (
                            <div
                                className="flex items-center gap-2 px-2 py-1 text-xs text-[#cccccc] font-medium hover:bg-[#2a2d2e] cursor-pointer"
                                onClick={onOpenFolder}
                            >
                                <ChevronDown size={16} />
                                <span>{getFolderName(rootPath)}</span>
                            </div>
                        )}

                        {/* File Tree */}
                        {fileTree.length > 0 && renderTree(fileTree)}

                        {/* Empty State */}
                        {rootPath && fileTree.length === 0 && (
                            <div className="p-4 text-sm text-[#858585]">
                                No files found in this folder
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'ai' && (
                    <div className="p-4 text-sm text-[#cccccc]">
                        <p className="mb-4">AI Assistant is active in the right panel.</p>
                        <p className="text-[#858585] text-xs">
                            Use Ctrl+L to open AI chat<br />
                            Use Ctrl+K for inline code actions
                        </p>
                    </div>
                )}

                {activeView === 'search' && (
                    <div className="p-2">
                        <input
                            type="text"
                            placeholder="Search"
                            className="w-full bg-[#3c3c3c] border border-[#555] rounded px-2 py-1 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]"
                        />
                    </div>
                )}

                {activeView === 'git' && (
                    <div className="p-4 text-sm text-[#858585]">
                        No source control providers registered.
                    </div>
                )}
            </div>
        </div>
    );
}

export default Sidebar;
