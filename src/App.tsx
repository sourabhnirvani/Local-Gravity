import { useState } from 'react';
import TitleBar from './components/TitleBar';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import EditorArea from './components/EditorArea';
import StatusBar from './components/StatusBar';
import AIChatPanel from './components/AIChatPanel';
import { OpenFile, FileNode } from './types';

export type ViewType = 'explorer' | 'search' | 'git' | 'ai';

function App() {
    const [activeView, setActiveView] = useState<ViewType>('explorer');
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [showAIPanel, setShowAIPanel] = useState(true);
    const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
    const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
    const [rootPath, setRootPath] = useState<string | null>(null);
    const [fileTree, setFileTree] = useState<FileNode[]>([]);

    const refreshFileTree = async (path: string | null = rootPath) => {
        if (!path) return;
        try {
            const files = await window.fileSystem?.readDirectory(path) || [];
            setFileTree(files);
        } catch (error) {
            console.error('Error refreshing file tree:', error);
        }
    };

    const handleOpenFolder = async () => {
        try {
            const path = await window.fileSystem?.openFolderDialog();
            if (path) {
                setRootPath(path);
                await refreshFileTree(path);
            }
        } catch (error) {
            console.error('Error opening folder:', error);
        }
    };

    const handleCreateFile = async () => {
        if (!rootPath) return;
        const fileName = prompt('Enter file name (e.g., src/components/NewComp.tsx):');
        if (!fileName) return;

        // Simple join: if user didn't provide absolute path (start with / or C:), append to root
        // But for now let's assume relative to root if simple name, or we can use a helper. 
        // We really need a "path.join" in renderer but we don't have it generally available unless we expose it.
        // Let's assume the user types a relative path "src/foo.ts" and we let the backend handle or we simple-concat.
        // Actually, window.fileSystem.createFile takes absolute path.
        // Let's do a simple heuristic:
        const fullPath = fileName.includes(':') || fileName.startsWith('/')
            ? fileName
            : `${rootPath}/${fileName}`; // Basic, might need normalization on backend but usually works

        try {
            const success = await window.fileSystem?.createFile(fullPath);
            if (success) {
                await refreshFileTree();
                // Optionally open it
                handleFileOpen(fullPath);
            } else {
                alert('Failed to create file');
            }
        } catch (error) {
            console.error('Error creating file:', error);
            alert('Error creating file');
        }
    };

    const handleCreateFolder = async () => {
        if (!rootPath) return;
        const folderName = prompt('Enter folder name:');
        if (!folderName) return;

        const fullPath = folderName.includes(':') || folderName.startsWith('/')
            ? folderName
            : `${rootPath}/${folderName}`;

        try {
            const success = await window.fileSystem?.createFolder(fullPath);
            if (success) {
                await refreshFileTree();
            } else {
                alert('Failed to create folder');
            }
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Error creating folder');
        }
    };

    const handleFileOpen = async (filePath: string) => {
        // Check if file is already open
        const existingIndex = openFiles.findIndex(f => f.path === filePath);
        if (existingIndex !== -1) {
            setActiveFileIndex(existingIndex);
            return;
        }

        // Load file content
        try {
            const content = await window.fileSystem?.readFile(filePath) || '';
            const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'untitled';
            const extension = fileName.split('.').pop() || '';

            const newFile: OpenFile = {
                path: filePath,
                name: fileName,
                content: content,
                language: getLanguageFromExtension(extension),
                isDirty: false
            };

            setOpenFiles([...openFiles, newFile]);
            setActiveFileIndex(openFiles.length);
        } catch (error) {
            console.error('Error opening file:', error);
        }
    };

    // ... handleFileOpen ... (unchanged)

    const handleFileClose = (index: number) => {
        const newFiles = openFiles.filter((_, i) => i !== index);
        setOpenFiles(newFiles);
        if (activeFileIndex >= newFiles.length) {
            setActiveFileIndex(Math.max(0, newFiles.length - 1));
        }
    };

    const handleContentChange = (content: string) => {
        if (openFiles.length === 0) return;

        const newFiles = [...openFiles];
        newFiles[activeFileIndex] = {
            ...newFiles[activeFileIndex],
            content,
            isDirty: true
        };
        setOpenFiles(newFiles);
    };

    const handleFileSave = async () => {
        if (openFiles.length === 0) return;

        const file = openFiles[activeFileIndex];
        try {
            await window.fileSystem?.writeFile(file.path, file.content);
            const newFiles = [...openFiles];
            newFiles[activeFileIndex] = { ...file, isDirty: false };
            setOpenFiles(newFiles);
            // Refresh tree on save in case it was a new file? Usually not needed for save, but maybe.
        } catch (error) {
            console.error('Error saving file:', error);
        }
    };

    const getLanguageFromExtension = (ext: string): string => {
        const map: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'typescript',
            'js': 'javascript',
            'jsx': 'javascript',
            'py': 'python',
            'java': 'java',
            'json': 'json',
            'html': 'html',
            'css': 'css',
            'md': 'markdown',
        };
        return map[ext] || 'plaintext';
    };

    const [aiPanelWidth, setAiPanelWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = (mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    };

    const stopResizing = () => {
        setIsResizing(false);
    };

    const resize = (mouseMoveEvent: React.MouseEvent) => {
        if (isResizing) {
            const newWidth = document.body.clientWidth - mouseMoveEvent.clientX;
            // Limit width
            if (newWidth > 200 && newWidth < document.body.clientWidth - 300) {
                setAiPanelWidth(newWidth);
            }
        }
    };

    return (
        <div
            className="h-screen w-screen flex flex-col overflow-hidden bg-[#1e1e1e]"
            onMouseMove={resize}
            onMouseUp={stopResizing}
        >
            {/* Title Bar */}
            <TitleBar />

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Activity Bar */}
                <ActivityBar activeView={activeView} onViewChange={setActiveView} />

                {/* Sidebar */}
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
                />

                {/* Editor + AI Panel */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Editor Area */}
                    <EditorArea
                        openFiles={openFiles}
                        activeFileIndex={activeFileIndex}
                        onFileSelect={setActiveFileIndex}
                        onFileClose={handleFileClose}
                        onContentChange={handleContentChange}
                        onSave={handleFileSave}
                    />

                    {/* AI Chat Panel & Resize Handle */}
                    {showAIPanel && (
                        <>
                            {/* Resize Handle */}
                            <div
                                className="w-1 cursor-col-resize hover:bg-[#007acc] active:bg-[#007acc] transition-colors"
                                onMouseDown={startResizing}
                            />
                            <AIChatPanel
                                onClose={() => setShowAIPanel(false)}
                                onCodeGenerated={(code) => handleContentChange(code)}
                                rootPath={rootPath}
                                fileTree={fileTree}
                                activeFile={openFiles[activeFileIndex]}
                                onSave={handleFileSave}
                                width={aiPanelWidth}
                                onRefreshFileTree={() => refreshFileTree()}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Status Bar */}
            <StatusBar />
        </div>
    );
}

export default App;
