import './polyfills';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import * as path from 'path';
import { pathToFileURL } from 'url';
import * as fs from 'fs/promises';
import { spawn, ChildProcess } from 'child_process';
import { initDatabase } from './database';
import { setupAuthHandlers } from './auth';
import { setupFeedbackHandlers } from './feedback';
import { setupQuestionPaperHandlers } from './questionPapers';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let ollamaProcess: ChildProcess | null = null;
let activeRunProcess: ChildProcess | null = null;
let currentWorkspaceRoot: string | null = null;
let lastRunFilePath: string | null = null;
let handlersInitialized = false;

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
  size?: number;
}

interface FileOpenResult {
  path: string;
  name: string;
  content: string;
}

function normalizePath(filePath: string) {
  return path.resolve(filePath);
}

function isPathInsideRoot(targetPath: string, rootPath: string) {
  const normalizedTarget = normalizePath(targetPath).toLowerCase();
  const normalizedRoot = normalizePath(rootPath).toLowerCase();
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`);
}

function assertWorkspacePath(targetPath: string) {
  if (!currentWorkspaceRoot) {
    throw new Error('Open a workspace folder first');
  }

  if (!isPathInsideRoot(targetPath, currentWorkspaceRoot)) {
    throw new Error('Access outside the current workspace is blocked');
  }
}

function sendRunEvent(channel: 'run-output' | 'run-status', payload: unknown) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
}

function startOllama() {
  try {
    ollamaProcess = spawn('ollama', ['serve'], {
      detached: false,
      stdio: 'ignore',
    });

    ollamaProcess.on('error', (error) => {
      console.error('Failed to start Ollama:', error.message);
    });

    ollamaProcess.on('exit', () => {
      ollamaProcess = null;
    });
  } catch (error) {
    console.error('Error starting Ollama:', error);
  }
}

function stopOllama() {
  if (ollamaProcess) {
    ollamaProcess.kill();
    ollamaProcess = null;
  }
}

function stopActiveRun() {
  if (!activeRunProcess) {
    return false;
  }

  activeRunProcess.kill();
  activeRunProcess = null;
  sendRunEvent('run-status', { state: 'stopped' });
  return true;
}

async function readDirectoryRecursive(dirPath: string, depth = 0): Promise<FileNode[]> {
  const maxDepth = 4;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'release') {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'directory',
        children: depth < maxDepth ? await readDirectoryRecursive(fullPath, depth + 1) : [],
      });
      continue;
    }

    const stats = await fs.stat(fullPath);
    nodes.push({
      name: entry.name,
      path: fullPath,
      type: 'file',
      extension: path.extname(entry.name).slice(1),
      size: stats.size,
    });
  }

  return nodes.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'directory' ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

async function showOpenFileDialog() {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Open File',
    properties: ['openFile'],
    defaultPath: currentWorkspaceRoot ?? app.getPath('documents'),
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];
  if (currentWorkspaceRoot && !isPathInsideRoot(selectedPath, currentWorkspaceRoot)) {
    throw new Error('Selected file is outside the current workspace');
  }

  const content = await fs.readFile(selectedPath, 'utf-8');
  const payload: FileOpenResult = {
    path: selectedPath,
    name: path.basename(selectedPath),
    content,
  };

  return payload;
}

async function showSaveFileDialog(defaultPath: string | undefined, content: string) {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Save File As',
    defaultPath: defaultPath ?? currentWorkspaceRoot ?? app.getPath('documents'),
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  await fs.mkdir(path.dirname(result.filePath), { recursive: true });
  await fs.writeFile(result.filePath, content, 'utf-8');

  return {
    path: result.filePath,
    name: path.basename(result.filePath),
  };
}

function resolveRunCommand(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.js':
    case '.cjs':
    case '.mjs':
      return { command: process.execPath, args: [filePath] };
    case '.py':
      return { command: 'python', args: [filePath] };
    case '.ps1':
      return { command: 'powershell', args: ['-ExecutionPolicy', 'Bypass', '-File', filePath] };
    case '.cmd':
    case '.bat':
      return { command: 'cmd.exe', args: ['/c', filePath] };
    default:
      throw new Error(`Running ${extension || 'this file type'} is not supported yet`);
  }
}

function runFile(filePath: string) {
  assertWorkspacePath(filePath);

  if (activeRunProcess) {
    stopActiveRun();
  }

  const { command, args } = resolveRunCommand(filePath);
  const cwd = currentWorkspaceRoot ?? path.dirname(filePath);
  lastRunFilePath = filePath;

  sendRunEvent('run-output', { type: 'system', message: `$ ${command} ${args.join(' ')}` });
  sendRunEvent('run-status', { state: 'running', filePath });

  activeRunProcess = spawn(command, args, {
    cwd,
    windowsHide: true,
  });

  activeRunProcess.stdout?.on('data', (chunk: Buffer) => {
    sendRunEvent('run-output', { type: 'stdout', message: chunk.toString() });
  });

  activeRunProcess.stderr?.on('data', (chunk: Buffer) => {
    sendRunEvent('run-output', { type: 'stderr', message: chunk.toString() });
  });

  activeRunProcess.on('error', (error) => {
    sendRunEvent('run-output', { type: 'stderr', message: error.message });
    sendRunEvent('run-status', { state: 'error', filePath, message: error.message });
    activeRunProcess = null;
  });

  activeRunProcess.on('exit', (code, signal) => {
    sendRunEvent('run-output', {
      type: 'system',
      message: signal ? `Process stopped with signal ${signal}` : `Process exited with code ${code ?? 0}`,
    });
    sendRunEvent('run-status', { state: 'idle', filePath, code, signal });
    activeRunProcess = null;
  });
}

function setupFileSystemHandlers() {
  ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      defaultPath: currentWorkspaceRoot ?? app.getPath('documents'),
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    currentWorkspaceRoot = normalizePath(result.filePaths[0]);
    return currentWorkspaceRoot;
  });

  ipcMain.handle('open-file-dialog', async () => showOpenFileDialog());

  ipcMain.handle('save-file-dialog', async (_, payload: { defaultPath?: string; content: string }) => {
    if (!payload || typeof payload.content !== 'string') {
      throw new Error('Invalid save request');
    }

    return showSaveFileDialog(payload.defaultPath, payload.content);
  });

  ipcMain.handle('read-directory', async (_, dirPath: string) => {
    assertWorkspacePath(dirPath);
    return readDirectoryRecursive(dirPath);
  });

  ipcMain.handle('read-file', async (_, filePath: string) => {
    assertWorkspacePath(filePath);
    return fs.readFile(filePath, 'utf-8');
  });

  ipcMain.handle('write-file', async (_, filePath: string, content: string) => {
    if (typeof content !== 'string') {
      throw new Error('Invalid file contents');
    }

    assertWorkspacePath(filePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  });

  ipcMain.handle('create-file', async (_, filePath: string) => {
    assertWorkspacePath(filePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, '', 'utf-8');
    return true;
  });

  ipcMain.handle('create-folder', async (_, dirPath: string) => {
    assertWorkspacePath(dirPath);
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  });

  ipcMain.handle('delete-file', async (_, filePath: string) => {
    assertWorkspacePath(filePath);
    await fs.unlink(filePath);
    return true;
  });

  ipcMain.handle('delete-folder', async (_, dirPath: string) => {
    assertWorkspacePath(dirPath);
    await fs.rm(dirPath, { recursive: true, force: true });
    return true;
  });
}

function setupRunHandlers() {
  ipcMain.handle('run-current-file', async (_, filePath: string) => {
    runFile(filePath);
    return { success: true };
  });

  ipcMain.handle('stop-run', async () => ({
    success: stopActiveRun(),
  }));

  ipcMain.handle('restart-run', async () => {
    if (!lastRunFilePath) {
      throw new Error('Nothing has been run yet');
    }

    runFile(lastRunFilePath);
    return { success: true };
  });
}

function setupShellHandlers() {
  ipcMain.handle('open-external-link', async (_, url: string) => {
    if (!/^https?:\/\//i.test(url)) {
      throw new Error('Only http(s) links are allowed');
    }

    await shell.openExternal(url);
    return true;
  });

  ipcMain.handle('open-local-file', async (_, filePath: string) => {
    if (!filePath) {
      throw new Error('File path is required');
    }

    assertWorkspacePath(filePath);

    const normalized = normalizePath(filePath);
    if (path.extname(normalized).toLowerCase() !== '.html') {
      throw new Error('Only local HTML files can be opened this way');
    }

    await shell.openExternal(pathToFileURL(normalized).toString());
    return true;
  });
}

function initializeHandlers() {
  if (handlersInitialized) {
    return;
  }

  setupFileSystemHandlers();
  setupRunHandlers();
  setupShellHandlers();
  setupQuestionPaperHandlers();
  handlersInitialized = true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0e0e11',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow?.close());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  initializeHandlers();
}

app.whenReady().then(() => {
  initDatabase();
  setupAuthHandlers();
  setupFeedbackHandlers();
  startOllama();
  setTimeout(createWindow, 700);
});

app.on('window-all-closed', () => {
  stopActiveRun();
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
