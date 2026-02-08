import { X, Circle } from 'lucide-react';
import { OpenFile } from '../types';
import { useEffect } from 'react';

interface EditorAreaProps {
    openFiles: OpenFile[];
    activeFileIndex: number;
    onFileSelect: (index: number) => void;
    onFileClose: (index: number) => void;
    onContentChange: (content: string) => void;
    onSave: () => void;
}

function EditorArea({
    openFiles,
    activeFileIndex,
    onFileSelect,
    onFileClose,
    onContentChange,
    onSave
}: EditorAreaProps) {
    const activeFile = openFiles[activeFileIndex];

    // Handle Ctrl+S for save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                onSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSave]);

    const getFileIcon = (extension: string) => {
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
        };
        return colorMap[extension] || '#519aba';
    };

    const getBreadcrumbs = (path: string) => {
        const parts = path.split(/[\\\/]/);
        return parts.slice(Math.max(0, parts.length - 3));
    };

    const handleTabClose = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        onFileClose(index);
    };

    if (openFiles.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1e1e] text-[#858585]">
                <p className="text-lg mb-2">No files open</p>
                <p className="text-sm">Open a folder from the Explorer to get started</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
            {/* Tab Bar */}
            <div className="h-9 bg-[#252526] flex items-center border-b border-[#252526] overflow-x-auto">
                {openFiles.map((file, index) => (
                    <div
                        key={file.path}
                        className={`tab ${index === activeFileIndex ? 'active' : ''}`}
                        onClick={() => onFileSelect(index)}
                    >
                        <Circle
                            size={8}
                            style={{ color: getFileIcon(file.name.split('.').pop() || '') }}
                            fill="currentColor"
                        />
                        <span>{file.name}</span>
                        {file.isDirty && <Circle size={6} className="text-white" fill="currentColor" />}
                        <button
                            className="tab-close"
                            onClick={(e) => handleTabClose(e, index)}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Breadcrumbs */}
            <div className="breadcrumb">
                {getBreadcrumbs(activeFile.path).map((part, index, arr) => (
                    <span key={index}>
                        <span className="breadcrumb-item hover:underline cursor-pointer">{part}</span>
                        {index < arr.length - 1 && <span className="text-[#6e6e6e]">/</span>}
                    </span>
                ))}
            </div>

            {/* Editor Content - Simple textarea for now */}
            <div className="flex-1 overflow-hidden">
                <textarea
                    className="w-full h-full bg-transparent text-[#d4d4d4] resize-none outline-none p-4 font-mono text-sm leading-6"
                    value={activeFile.content}
                    onChange={(e) => onContentChange(e.target.value)}
                    spellCheck={false}
                    style={{
                        tabSize: 4,
                    }}
                />
            </div>
        </div>
    );
}

export default EditorArea;
