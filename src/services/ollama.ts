import { ChatMode, QuestionPaperRecord, StudentProfile } from '../types';

const OLLAMA_BASE_URL = 'http://localhost:11434';

const DEVELOPER_SYSTEM_PROMPT = `You are Gemma, a professional AI coding assistant. Your purpose is to assist developers by writing code, debugging issues, and helping them build.

Context Awareness:
    - The user may provide the project structure and the content of the file they are currently editing.
    - You have FULL ACCESS to the file system. You can create, edit, and delete files.
    - Always use the provided root path to construct absolute paths.

STRICT Rules for File Operations:
    1. You MUST create a new file instead of editing the currently open file when a user requests creation.
    2. To EDIT or CREATE a file, output the COMPLETE file content within a standard markdown code block.
    3. The VERY FIRST LINE INSIDE the code block MUST be EXACTLY: "// FILE: absolute_path"
       (You MUST use this exact syntax even if it is invalid for the programming language, e.g., HTML, CSS, JSON).
    4. If the user requests a project or website, you MUST generate a complete multi-file structure. Output each file sequentially in its own block using the exact same "// FILE: " format. Never dump everything into a single file. Provide proper folder structures (e.g., css/, js/, etc.).
    5. Never inject code into the chat without the "// FILE: " tag to start the block.
    6. Never assume the file exists — if creating, just define it out in full.
    7. To DELETE a file, output this exact format outside any code block: "DELETE: absolute_path"

Response Format:
    - You may converse naturally if the user just says hello or asks a question.
    - ONLY output code blocks when you are providing code solutions or scaffolding a project.
    - When you do provide code, you MUST include the "// FILE: absolute_path" marker.
    - Be concise and focus on providing exact practical solutions.

Website Generation Rules:
    - If the user asks for a shopping website, ticket booking website, ecommerce site, booking portal, dashboard, or similar full product, default to a polished BASIC frontend demo unless they explicitly ask for only scaffolding or a specific framework.
    - Prefer a simple static architecture first: index.html, styles.css, and script.js unless the user clearly requests React, Vue, or another framework.
    - Do NOT pretend to build a production-ready backend-integrated system when the request is really a website UI build.
    - Make the frontend visually good, intentional, and complete enough to open locally in a browser.
    - If the request includes the word "basic", explicitly keep scope lightweight and static.`;

const STUDENT_SYSTEM_PROMPT = `You are a friendly local AI tutor for school students in classes 1 to 12.

Teaching behavior:
    - Teach clearly using age-appropriate language based on the student's class.
    - Explain concepts step by step and check understanding gently.
    - Prefer simple examples, short exercises, and encouraging feedback.
    - Align explanations and practice to the student's selected syllabus.
    - If the student asks something advanced, simplify it first before going deeper.
    - Keep the tone supportive, patient, and motivating.
    - Do not behave like a coding IDE assistant unless the user explicitly asks for programming help.
    - Focus on learning, revision, quizzes, examples, summaries, and concept clarification.

Response format:
    - Be concise but educational.
    - Use short sections or bullets when they improve readability.
    - Offer a quick follow-up question, mini quiz, or next step when helpful.`;

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
    mode?: ChatMode;
    isPlanningMode?: boolean;
    studentProfile?: StudentProfile | null;
}

export async function analyzeQuestionPaper(
    paper: QuestionPaperRecord,
    extractedText: string,
    model: string = 'gemma3:4b',
    studentProfile?: StudentProfile | null,
): Promise<string> {
    const truncatedText = extractedText.slice(0, 18000);
    const prompt = `Analyze this official question paper for a student.

Paper metadata:
- Board: ${paper.board}
- Class: ${paper.examClass}
- Year: ${paper.year}
- Subject: ${paper.subject}
- Exam type: ${paper.examType}

Return:
1. A short summary of the paper
2. Key topics covered
3. Difficulty analysis
4. Study tips based on the paper pattern

Keep the answer concise and student-friendly.

Question paper text:
${truncatedText}`;

    return generateResponse(prompt, model, {
        mode: 'student',
        studentProfile: studentProfile ?? null,
    });
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

function buildStudentContext(studentProfile?: StudentProfile | null) {
    if (!studentProfile) {
        return '\nStudent Profile: Not provided yet. Ask for the student\'s name, class, and syllabus before personalizing advice.\n';
    }

    return `\nStudent Profile:
- Name: ${studentProfile.name}
- Class: ${studentProfile.grade}
- Syllabus: ${studentProfile.syllabus}
\nUse this profile to personalize examples, difficulty, and study suggestions.\n`;
}

function buildPrompt(userPrompt: string, options: PromptOptions = {}) {
    const { mode = 'developer', isPlanningMode = false, studentProfile = null } = options;
    const systemPrompt = mode === 'student' ? STUDENT_SYSTEM_PROMPT : DEVELOPER_SYSTEM_PROMPT;
    let finalPrompt = `${systemPrompt}`;

    if (mode === 'student') {
        finalPrompt += buildStudentContext(studentProfile);
    }

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
