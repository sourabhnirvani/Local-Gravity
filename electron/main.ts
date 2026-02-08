import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn, ChildProcess } from 'child_process';

const isDev = !app.isPackaged;
let ollamaProcess: ChildProcess | null = null;

function startOllama() {
  try {
    console.log('Starting Ollama server...');
    ollamaProcess = spawn('ollama', ['serve'], {
      detached: false,
      stdio: 'ignore', // Suppress output
    });

    ollamaProcess.on('error', (error) => {
      console.error('Failed to start Ollama:', error.message);
      console.error('Make sure Ollama is installed: https://ollama.ai');
    });

    ollamaProcess.on('exit', (code) => {
      console.log(`Ollama process exited with code ${code}`);
      ollamaProcess = null;
    });

    console.log('Ollama server started successfully');
  } catch (error) {
    console.error('Error starting Ollama:', error);
  }
}

function stopOllama() {
  if (ollamaProcess) {
    console.log('Stopping Ollama server...');
    ollamaProcess.kill();
    ollamaProcess = null;
  }
}

// File system operations
interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
  size?: number;
}

async function readDirectoryRecursive(dirPath: string, depth: number = 0): Promise<FileNode[]> {
  const maxDepth = 3; // Limit recursion depth for performance

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      // Skip hidden files and common ignore patterns
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const node: FileNode = {
          name: entry.name,
          path: fullPath,
          type: 'directory',
          children: depth < maxDepth ? await readDirectoryRecursive(fullPath, depth + 1) : []
        };
        nodes.push(node);
      } else {
        const stats = await fs.stat(fullPath);
        const ext = path.extname(entry.name).slice(1);
        nodes.push({
          name: entry.name,
          path: fullPath,
          type: 'file',
          extension: ext || undefined,
          size: stats.size
        });
      }
    }

    return nodes.sort((a, b) => {
      // Directories first, then alphabetically
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
}

function setupFileSystemHandlers() {
  // Open folder dialog
  ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Read directory
  ipcMain.handle('read-directory', async (event, dirPath: string) => {
    try {
      return await readDirectoryRecursive(dirPath);
    } catch (error) {
      console.error('Error reading directory:', error);
      throw error;
    }
  });

  // Read file
  ipcMain.handle('read-file', async (event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  });

  // Write file (auto-create directories)
  ipcMain.handle('write-file', async (event, filePath: string, content: string) => {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  });

  // Create new file
  ipcMain.handle('create-file', async (event, filePath: string) => {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, '', 'utf-8');
      return true;
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  });

  // Create new folder
  ipcMain.handle('create-folder', async (event, dirPath: string) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  });

  // Delete file
  ipcMain.handle('delete-file', async (event, filePath: string) => {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  });

  // Delete folder
  ipcMain.handle('delete-folder', async (event, dirPath: string) => {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Window controls
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow.close());

  // File system IPC handlers
  setupFileSystemHandlers();
}

app.whenReady().then(() => {
  startOllama();
  // Give Ollama a moment to start before opening window
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', () => {
  stopOllama();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
