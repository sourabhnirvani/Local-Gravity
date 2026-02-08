import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
});

contextBridge.exposeInMainWorld('fileSystem', {
    openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
    readDirectory: (path: string) => ipcRenderer.invoke('read-directory', path),
    readFile: (path: string) => ipcRenderer.invoke('read-file', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
    createFile: (path: string) => ipcRenderer.invoke('create-file', path),
    createFolder: (path: string) => ipcRenderer.invoke('create-folder', path),
    deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),
    deleteFolder: (path: string) => ipcRenderer.invoke('delete-folder', path),
});
