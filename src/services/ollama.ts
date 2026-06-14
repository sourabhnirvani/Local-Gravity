const OLLAMA_BASE_URL = 'http://localhost:11434';

const DEVELOPER_SYSTEM_PROMPT = `You are Gemma, a professional AI coding assistant. Your purpose is to assist developers by writing code, debugging issues, executing terminal commands, and helping them build.

Context Awareness:
    - The user may provide the project structure and the content of the file they are currently editing.
    - You have FULL ACCESS to the file system. You can create, edit, and delete files.
    - Always use the provided root path to construct absolute paths.
    - You have FULL ACCESS to the terminal. You can and should execute shell commands automatically when needed (e.g., pushing edits, managing files, running tests, or building).

STRICT Rules for Operations:
    1. You MUST create a new file instead of editing the currently open file when a user requests creation.
    2. To EDIT or CREATE a file, output the COMPLETE file content within a standard markdown code block.
    3. The VERY FIRST LINE INSIDE the code block MUST be EXACTLY: "// FILE: absolute_path"
       (You MUST use this exact syntax even if it is invalid for the programming language, e.g., HTML, CSS, JSON).
    4. If the user requests a project or website, you MUST generate a complete multi-file structure. Output each file sequentially in its own block using the exact same "// FILE: " format. Never dump everything into a single file. Provide proper folder structures.
    5. To EXECUTE A TERMINAL COMMAND, output the command within a standard markdown bash code block.
    6. The VERY FIRST LINE INSIDE the command code block MUST be EXACTLY: "// COMMAND: command_to_execute"
       (e.g., "// COMMAND: npm install" or "// COMMAND: git status").
    7. Never inject code into the chat without the "// FILE: " or "// COMMAND: " tag to start the block.
    8. To DELETE a file, output this exact format outside any code block: "DELETE: absolute_path"
    9. Use the terminal proactively to read files (cat), manage git (git push), install packages (npm install), and more.

Response Format:
    - You may converse naturally if the user just says hello or asks a question.
    - ONLY output code blocks when you are providing code solutions, scaffolding a project, or executing a command.
    - Be concise and focus on providing exact practical solutions.`;

export interface OllamaResponse {
    model: string;
    response: string;
    done: boolean;
}

export interface OllamaModelInfo {
    name: string;
    modified_at: string;
    size: number;
}

export interface PromptOptions {
    isPlanningMode?: boolean;
}

export async function getLocalModels(): Promise<OllamaModelInfo[]> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
        }
        const data = await response.json();
        return data.models || [];
    } catch (error) {
        console.error('Error fetching Ollama models:', error);
        return [];
    }
}

function buildPrompt(userPrompt: string, options: PromptOptions = {}) {
    const { isPlanningMode = false } = options;
    let finalPrompt = `${DEVELOPER_SYSTEM_PROMPT}`;

    if (isPlanningMode) {
        finalPrompt += `\n\nPLANNING MODE ACTIVE:\nYour response MUST strictly follow this structure:\n<thought>\n[Outline your step-by-step reasoning here. DO NOT write any code blocks here.]\n</thought>\n[Write your final response and actual code blocks here]`;
    }

    finalPrompt += `\n\nUser: ${userPrompt}\n\nAssistant:`;
    return finalPrompt;
}

export async function generateResponse(
    prompt: string,
    model: string = 'gemma3:4b',
    options: PromptOptions = {}
): Promise<string> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model,
            prompt: buildPrompt(prompt, options),
            stream: false,
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
}

export async function* generateResponseStream(
    prompt: string,
    model: string = 'gemma3:4b',
    options: PromptOptions = {},
    signal?: AbortSignal
): AsyncGenerator<string> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model,
            prompt: buildPrompt(prompt, options),
            stream: true,
        }),
        signal
    });

    if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
            try {
                const parsed: OllamaResponse = JSON.parse(line);
                yield parsed.response;
            } catch {
                // Skip invalid JSON
            }
        }
    }
}

export async function checkOllamaStatus(): Promise<boolean> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        return response.ok;
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Agent mode: real tool-calling via Ollama's /api/chat endpoint.
// Requires a model with tool-calling support (e.g. qwen2.5-coder, llama3.1,
// mistral-nemo). gemma3:4b does NOT reliably support this - use the plain
// generate* functions above for normal chat.
// ---------------------------------------------------------------------------

export interface AgentToolCallFunction {
    name: string;
    arguments: Record<string, unknown> | string;
}

export interface AgentToolCall {
    id?: string;
    function: AgentToolCallFunction;
}

export interface AgentChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: AgentToolCall[];
}

export const AGENT_SYSTEM_PROMPT = `You are an autonomous coding agent working inside LocalGravity, a desktop IDE.

You have tools to read, search, edit, and create files in the user's project, and to run shell commands. All file paths you pass to tools MUST be relative to the workspace root (e.g. "src/App.tsx"), never absolute, never with a drive letter.

Workflow rules:
1. Before editing a file you have not seen in this conversation, use list_directory and/or read_file to understand it. Do not guess file contents or assume a file's structure.
2. Prefer edit_file for any file that already exists - it makes one precise, minimal replacement. Only use write_file for brand-new files or when a file genuinely needs a full rewrite. old_text in edit_file must match the file's current content exactly (including whitespace/indentation) and must be unique in the file - include enough surrounding lines to make it unique.
3. For multi-step tasks, call update_task_list early with your plan, then call it again to update item statuses ('pending' -> 'in_progress' -> 'done') as you progress.
4. Use run_command for installing packages, running builds/tests, or git operations. It runs in the workspace root.
5. Make ONE tool call at a time and wait for its result before deciding the next step. Do not call multiple tools in the same turn.
6. When the entire user request is fully done, call task_complete with a short summary. Do not call it early - only when nothing is left to do.

Be direct. Don't narrate steps in prose - let the tool calls do the work. Only write plain text when asking the user a clarifying question, or in your final task_complete summary.`;

export const AGENT_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: 'Read the full text content of a file in the workspace. Use this before editing a file you have not already seen.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path relative to the workspace root, e.g. src/App.tsx' },
                },
                required: ['path'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_directory',
            description: 'List files and folders in the workspace (recursive, excludes node_modules/dist/.git/release). Use "." for the workspace root.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path relative to workspace root, or "." for the root' },
                },
                required: ['path'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'search_files',
            description: 'Search the entire workspace for files whose contents contain the given text or code snippet. Returns matching file paths.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Text or code snippet to search for' },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'edit_file',
            description: 'Make a targeted edit to an EXISTING file by replacing one exact, unique block of text with new text. Prefer this over write_file for files that already exist.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path relative to workspace root' },
                    old_text: { type: 'string', description: 'Exact existing text to find. Must be unique in the file - include surrounding context if needed.' },
                    new_text: { type: 'string', description: 'Text to replace it with' },
                },
                required: ['path', 'old_text', 'new_text'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'write_file',
            description: 'Create a new file with the given full content, or completely overwrite an existing file. Only use for new files or full rewrites - for small changes to existing files use edit_file instead.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path relative to workspace root' },
                    content: { type: 'string', description: 'Full file content' },
                },
                required: ['path', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_file',
            description: 'Delete a file from the workspace.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path relative to workspace root' },
                },
                required: ['path'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'run_command',
            description: 'Run a shell command in the workspace root directory (e.g. npm install <pkg>, npm run build, git status). Returns stdout and stderr.',
            parameters: {
                type: 'object',
                properties: {
                    command: { type: 'string', description: 'The shell command to execute' },
                },
                required: ['command'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_task_list',
            description: 'Set or update the visible task list/plan shown to the user. Call at the start of a multi-step task, and again whenever item statuses change.',
            parameters: {
                type: 'object',
                properties: {
                    tasks: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                text: { type: 'string' },
                                status: { type: 'string', enum: ['pending', 'in_progress', 'done'] },
                            },
                            required: ['text', 'status'],
                        },
                    },
                },
                required: ['tasks'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'task_complete',
            description: 'Call exactly once when the entire user request has been fully completed, to end the session. Provide a short summary of what was done.',
            parameters: {
                type: 'object',
                properties: {
                    summary: { type: 'string', description: 'Short summary of what was done' },
                },
                required: ['summary'],
            },
        },
    },
];

export async function chatWithTools(
    messages: AgentChatMessage[],
    model: string,
    signal?: AbortSignal,
): Promise<AgentChatMessage> {
    let response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages,
            tools: AGENT_TOOLS,
            stream: false,
            options: { temperature: 0.1 },
        }),
        signal,
    });

    // If model or Ollama version doesn't support tools (throws 400 Bad Request),
    // fallback to text-only prompt injection of tools
    if (response.status === 400) {
        const fallbackMessages = [...messages];
        if (fallbackMessages[0]?.role === 'system') {
            fallbackMessages[0].content += `\n\nAVAILABLE TOOLS:\nYou must use tools by outputting raw JSON in this format: {"name": "tool_name", "arguments": {"arg1": "value"}}\n${JSON.stringify(AGENT_TOOLS, null, 2)}`;
        }
        
        response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: fallbackMessages,
                stream: false,
                options: { temperature: 0.1 },
            }),
            signal,
        });
    }

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const errBody = await response.json();
            if (errBody.error) errorMsg = errBody.error;
        } catch {}
        throw new Error(`Ollama error: ${errorMsg}`);
    }

    const data = await response.json();
    return data.message as AgentChatMessage;
}

