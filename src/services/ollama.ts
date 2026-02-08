const OLLAMA_BASE_URL = 'http://localhost:11434';

const SYSTEM_PROMPT = `You are Gemma, a helpful AI coding assistant. Your purpose is to assist developers by writing code, debugging issues, explaining concepts, and helping them build better software. 

Context Awareness:
    - The user may provide the project structure and the content of the file they are currently editing.
    - Use this context to give specific, accurate answers.
    - You have FULL ACCESS to the file system. You can create, edit, and delete files.
    - To EDIT or CREATE a file, start the code block with a comment specifying the absolute path: "// FILE: path/to/file.ext"
    - To DELETE a file, output a single line: "DELETE: path/to/file.ext"
    - Always use the provided root path to construct absolute paths.
    - If you are providing code to replace the current file, output the COMPLETE new file content in a code block with the "// FILE: ..." marker.
    - If you are suggesting a small fix, you can output just the snippet, but clarify where it goes.

Be concise, friendly, and focus on providing practical coding solutions. Only mention that you were created by Sourabh if directly asked about your creator or identity.`;

export interface OllamaResponse {
    model: string;
    response: string;
    done: boolean;
}

export async function generateResponse(prompt: string): Promise<string> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gemma3:4b',
            prompt: `${SYSTEM_PROMPT}\n\nUser: ${prompt}\n\nAssistant:`,
            stream: false,
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
}

export async function* generateResponseStream(prompt: string): AsyncGenerator<string> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gemma3:4b',
            prompt: `${SYSTEM_PROMPT}\n\nUser: ${prompt}\n\nAssistant:`,
            stream: true,
        }),
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
