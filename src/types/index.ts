// File system types
export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
    extension?: string;
    size?: number;
}

export interface OpenFile {
    path: string;
    name: string;
    content: string;
    language: string;
    isDirty: boolean;
}

// Global type declarations for Electron APIs
declare global {
    interface Window {
        electronAPI?: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
        };

        fileSystem?: {
            openFolderDialog: () => Promise<string | null>;
            readDirectory: (path: string) => Promise<FileNode[]>;
            readFile: (path: string) => Promise<string>;
            writeFile: (path: string, content: string) => Promise<boolean>;
            createFile: (path: string) => Promise<boolean>;
            createFolder: (path: string) => Promise<boolean>;
            deleteFile: (path: string) => Promise<boolean>;
            deleteFolder: (path: string) => Promise<boolean>;
        };
    }
}

export { };
