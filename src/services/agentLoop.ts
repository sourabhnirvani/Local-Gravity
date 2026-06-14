import { AgentChatMessage, AgentToolCall, chatWithTools } from './ollama';
import { FileNode } from '../types';

export interface AgentStep {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  status: 'running' | 'done' | 'error';
  summary: string;
  detail?: string;
}

export type PendingChangeType = 'create' | 'edit' | 'delete';

export interface PendingFileChange {
  path: string;
  type: PendingChangeType;
  originalContent: string | null;
  currentContent: string | null;
}

export interface TaskItem {
  text: string;
  status: 'pending' | 'in_progress' | 'done';
}

export interface RunAgentOptions {
  messages: AgentChatMessage[];
  model: string;
  rootPath: string;
  signal?: AbortSignal;
  pendingChanges: Map<string, PendingFileChange>;
  onStep: (step: AgentStep) => void;
  onTaskList: (tasks: TaskItem[]) => void;
}

export interface RunAgentResult {
  messages: AgentChatMessage[];
  finalText: string;
  completed: boolean;
}

const MAX_ITERATIONS = 20;
const MAX_RESULT_CHARS = 6000;

function resolvePath(rootPath: string, relativePath: string): string {
  const raw = relativePath ?? '';
  if (/^[a-zA-Z]:[/\\]/.test(raw) || raw.startsWith('/')) {
    return raw;
  }
  const cleaned = raw.replace(/^[/\\.]+/, '').replace(/\\/g, '/');
  return `${rootPath.replace(/[/\\]+$/, '')}/${cleaned}`;
}

function truncate(text: string, max = MAX_RESULT_CHARS): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}\n... [truncated, ${text.length - max} more characters]`;
}

function flattenFileTree(nodes: FileNode[], depth = 0): string {
  let out = '';
  for (const node of nodes) {
    out += `${'  '.repeat(depth)}${node.type === 'directory' ? '[dir] ' : '[file] '}${node.name}\n`;
    if (node.children?.length) {
      out += flattenFileTree(node.children, depth + 1);
    }
  }
  return out;
}

function parseArgs(call: AgentToolCall): Record<string, any> {
  try {
    const raw = call.function.arguments;
    if (typeof raw === 'string') {
      return raw.trim() ? JSON.parse(raw) : {};
    }
    return raw ?? {};
  } catch {
    return {};
  }
}

async function ensureTracked(pendingChanges: Map<string, PendingFileChange>, fullPath: string, relPath: string) {
  if (pendingChanges.has(relPath)) {
    return;
  }
  try {
    const original = await window.fileSystem!.readFile(fullPath);
    pendingChanges.set(relPath, { path: relPath, type: 'edit', originalContent: original, currentContent: original });
  } catch {
    pendingChanges.set(relPath, { path: relPath, type: 'create', originalContent: null, currentContent: null });
  }
}

async function refreshCurrent(pendingChanges: Map<string, PendingFileChange>, fullPath: string, relPath: string) {
  try {
    const current = await window.fileSystem!.readFile(fullPath);
    const entry = pendingChanges.get(relPath);
    if (entry) {
      entry.currentContent = current;
    }
  } catch {
    // ignore - file may have been deleted by a later step
  }
}

async function executeTool(
  call: AgentToolCall,
  rootPath: string,
  pendingChanges: Map<string, PendingFileChange>,
  onTaskList: (tasks: TaskItem[]) => void,
  args: Record<string, any>,
): Promise<{ summary: string; detail: string }> {
  const name = call.function.name;

  if (!window.fileSystem || !window.runtime) {
    throw new Error('File system bridge unavailable');
  }

  switch (name) {
    case 'read_file': {
      const full = resolvePath(rootPath, args.path);
      const content = await window.fileSystem.readFile(full);
      return { summary: `Read ${args.path}`, detail: truncate(content) };
    }

    case 'list_directory': {
      const target = !args.path || args.path === '.' ? rootPath : resolvePath(rootPath, args.path);
      const tree = await window.fileSystem.readDirectory(target);
      return { summary: `Listed ${args.path || '.'}`, detail: truncate(flattenFileTree(tree)) };
    }

    case 'search_files': {
      const results = (await window.fileSystem.searchFiles?.(args.query)) ?? [];
      const listing = results.map((r) => r.path).join('\n') || 'No matches found.';
      return { summary: `Searched for "${args.query}" (${results.length} matches)`, detail: truncate(listing) };
    }

    case 'edit_file': {
      const full = resolvePath(rootPath, args.path);
      await ensureTracked(pendingChanges, full, args.path);
      await window.fileSystem.editFile!(full, args.old_text, args.new_text);
      await refreshCurrent(pendingChanges, full, args.path);
      return { summary: `Edited ${args.path}`, detail: 'Edit applied successfully.' };
    }

    case 'write_file': {
      const full = resolvePath(rootPath, args.path);
      await ensureTracked(pendingChanges, full, args.path);
      await window.fileSystem.writeFile(full, args.content ?? '');
      const entry = pendingChanges.get(args.path);
      if (entry) {
        entry.currentContent = args.content ?? '';
      }
      return { summary: `Wrote ${args.path}`, detail: 'File written successfully.' };
    }

    case 'delete_file': {
      const full = resolvePath(rootPath, args.path);
      await ensureTracked(pendingChanges, full, args.path);
      await window.fileSystem.deleteFile(full);
      const entry = pendingChanges.get(args.path);
      if (entry) {
        entry.type = 'delete';
        entry.currentContent = null;
      }
      return { summary: `Deleted ${args.path}`, detail: 'File deleted.' };
    }

    case 'run_command': {
      const result = await window.runtime.runTerminalCommand(args.command);
      const out = `${result.stdout || ''}${result.stderr ? `\nSTDERR:\n${result.stderr}` : ''}`.trim();
      return { summary: `Ran: ${args.command}`, detail: truncate(out || '(no output)') };
    }

    case 'update_task_list': {
      const tasks: TaskItem[] = Array.isArray(args.tasks) ? args.tasks : [];
      onTaskList(tasks);
      return {
        summary: `Updated task list (${tasks.length} items)`,
        detail: tasks.map((t) => `[${t.status}] ${t.text}`).join('\n'),
      };
    }

    default:
      return { summary: `Unknown tool: ${name}`, detail: `No executor registered for tool "${name}"` };
  }
}

export async function runAgent(opts: RunAgentOptions): Promise<RunAgentResult> {
  const { model, rootPath, signal, pendingChanges, onStep, onTaskList } = opts;
  const messages = [...opts.messages];

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    const reply = await chatWithTools(messages, model, signal);
    messages.push(reply);

    let parsedToolCalls = reply.tool_calls || [];
    
    // Fallback for models that output raw JSON instead of using native tool calls
    if (parsedToolCalls.length === 0 && reply.content) {
      try {
        const text = reply.content.trim();
        // If it looks like JSON tool call
        if (text.startsWith('{') && text.endsWith('}')) {
          const parsed = JSON.parse(text);
          if (parsed.name && parsed.arguments) {
            parsedToolCalls = [
              {
                function: {
                  name: parsed.name,
                  arguments: typeof parsed.arguments === 'string' ? parsed.arguments : JSON.stringify(parsed.arguments),
                },
              },
            ];
            reply.content = ''; // Clear content so it doesn't just print the JSON
          }
        }
      } catch {
        // ignore JSON parse errors
      }
    }

    if (parsedToolCalls.length === 0) {
      return { messages, finalText: reply.content || '', completed: true };
    }

    for (const call of parsedToolCalls) {
      const stepId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const args = parseArgs(call);

      onStep({ id: stepId, tool: call.function.name, args, status: 'running', summary: `Running ${call.function.name}...` });

      if (call.function.name === 'task_complete') {
        const summary = typeof args.summary === 'string' ? args.summary : 'Task complete';
        onStep({ id: stepId, tool: call.function.name, args, status: 'done', summary });
        messages.push({ role: 'tool', content: 'Task marked complete.' });
        return { messages, finalText: summary, completed: true };
      }

      try {
        const { summary, detail } = await executeTool(call, rootPath, pendingChanges, onTaskList, args);
        onStep({ id: stepId, tool: call.function.name, args, status: 'done', summary, detail });
        messages.push({ role: 'tool', content: `${summary}\n${detail}` });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Tool execution failed';
        onStep({ id: stepId, tool: call.function.name, args, status: 'error', summary: message });
        messages.push({ role: 'tool', content: `Error running ${call.function.name}: ${message}` });
      }
    }
  }

  return {
    messages,
    finalText: `Stopped after ${MAX_ITERATIONS} steps to avoid a runaway loop. Review progress and send a follow-up message to continue.`,
    completed: false,
  };
}

export async function revertPendingChanges(rootPath: string, pendingChanges: Map<string, PendingFileChange>): Promise<void> {
  for (const [relPath, change] of pendingChanges) {
    const full = resolvePath(rootPath, relPath);
    try {
      if (change.type === 'create') {
        await window.fileSystem!.deleteFile(full);
      } else if (change.originalContent !== null) {
        // Restores edited files, and recreates files the agent deleted.
        await window.fileSystem!.writeFile(full, change.originalContent);
      }
    } catch {
      // best-effort revert; skip files that no longer make sense to touch
    }
  }
  pendingChanges.clear();
}

export function resolveWorkspacePath(rootPath: string, relativePath: string): string {
  return resolvePath(rootPath, relativePath);
}
