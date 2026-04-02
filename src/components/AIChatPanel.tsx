import { useEffect, useMemo, useRef, useState } from 'react';
import AIChatHeader from './AIChatHeader';
import AIComposer from './AIComposer';
import AIMessageList from './AIMessageList';
import StudentOnboardingCard from './StudentOnboardingCard';
import { generateResponseStream, getLocalModels, OllamaModelInfo } from '../services/ollama';
import { buildPrebuiltWebsiteProject } from '../services/prebuiltWebsites';
import { ChatMessage, ChatMode, FileNode, OpenFile, StudentProfile, WebsiteGenerationMeta } from '../types';

interface AIChatPanelProps {
  onClose: () => void;
  onApplyCode: (path: string, content: string) => Promise<void> | void;
  onLivePreview: (path: string, content: string) => void;
  rootPath: string | null;
  fileTree: FileNode[];
  activeFile?: OpenFile;
  aiMode: ChatMode;
  studentProfile: StudentProfile | null;
  onAiModeChange: (mode: ChatMode) => void;
  onStudentProfileChange: (profile: StudentProfile | null) => void;
}

const INITIAL_MESSAGES: Record<ChatMode, ChatMessage[]> = {
  developer: [
    {
      id: 'developer-welcome',
      role: 'assistant',
      content: "Hi! I'm Gemma. I can read, write, and create files in your project.\n\nTo create or edit a file, just tell me what to do. I'll provide a code block with the target file path. Click 'Apply' to save the changes.\n\nExample: \"Create a new component called Button.tsx\"",
    },
  ],
  student: [
    {
      id: 'student-welcome',
      role: 'assistant',
      content: "Welcome to Student Learning Mode.\n\nI can explain lessons, help with revision, create practice questions, and adapt examples to the student's class and syllabus.",
    },
  ],
};

const STUDENT_STARTERS = [
  'Explain today\'s science topic in simple steps',
  'Give me 5 revision questions for my class',
  'Help me understand a math chapter with examples',
];

const WEBSITE_REQUEST_REGEX = /\b(website|landing page|homepage|shopping website|ticket booking|ecommerce|e-commerce|booking portal|dashboard|frontend site|portfolio site)\b/i;
const OPEN_REQUEST_REGEX = /\b(open it|open the site|open website|launch it|preview it)\b/i;
const WEBSITE_CREATE_REGEX = /\b(create|build|make|generate|develop|design|scaffold)\b/i;
const WEBSITE_EDIT_REGEX = /\b(edit|modify|update|change|improve|fix|redesign|tweak|adjust|revamp)\b/i;

function detectWebsiteGenerationMeta(input: string): WebsiteGenerationMeta {
  const isWebsiteRequest = WEBSITE_REQUEST_REGEX.test(input);
  const shouldAutoOpen = isWebsiteRequest && OPEN_REQUEST_REGEX.test(input);
  const isBasicWebsite = isWebsiteRequest && /\bbasic\b/i.test(input);

  return {
    isWebsiteRequest,
    shouldAutoOpen,
    isBasicWebsite,
  };
}

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildWebsiteGenerationTranscript(siteTitle: string, outputDirectory: string, files: Array<{ path: string; language: string; content: string }>) {
  const steps: string[] = [
    `Using the built-in ${siteTitle} starter so the final website stays polished and reliable with the local model.`,
    '',
    'Build plan:',
    '1. Prepare the project folder.',
    '2. Generate the HTML, CSS, and JavaScript files.',
    '3. Save the files into the workspace.',
    '4. Open the finished site locally.',
    '',
    `Output folder: ${outputDirectory}`,
    '',
    'Starting generation...',
    '',
  ];

  for (const file of files) {
    steps.push(`Generating ${file.path.split(/[\\/]/).pop()}...`);
    steps.push('');
    steps.push(`\`\`\`${file.language}`);
    steps.push(`// FILE: ${file.path}`);
    steps.push(file.content);
    steps.push('```');
    steps.push('');
  }

  steps.push('Saving generated files to the workspace...');
  steps.push('');
  steps.push('Opening the generated website...');
  return `${steps.join('\n')}\n`;
}

function createSimulatedGenerationChunks(content: string) {
  const chunks: string[] = [];
  let index = 0;

  while (index < content.length) {
    const currentChar = content[index];

    if (currentChar === '\n') {
      chunks.push('\n');
      index += 1;
      continue;
    }

    const remaining = content.slice(index);
    const codeFenceMatch = remaining.match(/^```[a-z]*\n?/i);
    if (codeFenceMatch) {
      chunks.push(codeFenceMatch[0]);
      index += codeFenceMatch[0].length;
      continue;
    }

    const chunkSize = currentChar === ' ' ? 1 : 18;
    chunks.push(content.slice(index, index + chunkSize));
    index += chunkSize;
  }

  return chunks;
}

function getChunkDelay(chunk: string) {
  if (chunk === '\n') {
    return 22;
  }

  if (chunk.startsWith('```')) {
    return 120;
  }

  if (chunk.includes('// FILE:')) {
    return 90;
  }

  if (/[{}<>]/.test(chunk)) {
    return 18;
  }

  return 28;
}

function shouldUsePrebuiltWebsiteFlow(input: string) {
  return WEBSITE_REQUEST_REGEX.test(input) && WEBSITE_CREATE_REGEX.test(input) && !WEBSITE_EDIT_REGEX.test(input);
}

function getWebsiteSimulationDuration(files: Array<{ content: string }>) {
  const totalLength = files.reduce((sum, file) => sum + file.content.length, 0);
  return totalLength > 14000 ? 120000 : 60000;
}

function getChunkDelaySequence(chunks: string[], totalDurationMs: number) {
  const weights = chunks.map((chunk) => {
    if (chunk === '\n') {
      return 0.5;
    }

    if (chunk.startsWith('```')) {
      return 2.5;
    }

    if (chunk.includes('// FILE:')) {
      return 2;
    }

    if (/[{}<>]/.test(chunk)) {
      return 0.65;
    }

    return Math.max(0.7, chunk.length / 10);
  });

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const rawDelays = weights.map((weight) => Math.max(12, Math.round((weight / totalWeight) * totalDurationMs)));
  const totalRaw = rawDelays.reduce((sum, delayMs) => sum + delayMs, 0);
  const adjustment = totalDurationMs - totalRaw;

  if (adjustment !== 0 && rawDelays.length > 0) {
    rawDelays[rawDelays.length - 1] = Math.max(12, rawDelays[rawDelays.length - 1] + adjustment);
  }

  return rawDelays;
}

function previewLatestGeneratedFile(content: string, onLivePreview: (path: string, code: string) => void) {
  const regexMatches = [...content.matchAll(/```[\s\S]*?(?:\/\/ FILE: ([^\n]+)\n)([\s\S]*?)(?:```|$)/g)];
  if (regexMatches.length === 0) {
    return;
  }

  const lastMatch = regexMatches[regexMatches.length - 1];
  const targetPath = lastMatch[1].trim().replace(/[.:]$/, '');
  const codeContent = lastMatch[2];
  onLivePreview(targetPath, codeContent);
}

export default function AIChatPanel({
  onClose,
  onApplyCode,
  onLivePreview,
  rootPath,
  fileTree,
  activeFile,
  aiMode,
  studentProfile,
  onAiModeChange,
  onStudentProfileChange,
}: AIChatPanelProps) {
  const [messagesByMode, setMessagesByMode] = useState<Record<ChatMode, ChatMessage[]>>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemma3:4b');
  const [isPlanningMode, setIsPlanningMode] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [websiteMetaByMessage, setWebsiteMetaByMessage] = useState<Record<string, WebsiteGenerationMeta>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = messagesByMode[aiMode] ?? INITIAL_MESSAGES[aiMode];
  const isStudentMode = aiMode === 'student';
  const needsOnboarding = isStudentMode && !studentProfile;

  const studentWelcome = useMemo(() => {
    if (!studentProfile) {
      return null;
    }

    return `Hi ${studentProfile.name}! I am ready with class ${studentProfile.grade} ${studentProfile.syllabus} learning help.\n\nYou can ask for explanations, revision notes, quick quizzes, or practice exercises.`;
  }, [studentProfile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchModels = async () => {
      const localModels = await getLocalModels();
      setModels(localModels);
      if (localModels.length > 0 && !localModels.find((model) => model.name === 'gemma3:4b')) {
        setSelectedModel(localModels[0].name);
      }
    };

    fetchModels();
  }, []);

  useEffect(() => {
    if (!studentProfile) {
      return;
    }

    setMessagesByMode((current) => {
      const studentMessages = current.student ?? INITIAL_MESSAGES.student;
      const alreadyPersonalized = studentMessages.some((message) => message.id === 'student-profile-welcome');

      if (alreadyPersonalized) {
        return current;
      }

      return {
        ...current,
        student: [
          INITIAL_MESSAGES.student[0],
          {
            id: 'student-profile-welcome',
            role: 'assistant',
            content: studentWelcome ?? INITIAL_MESSAGES.student[0].content,
          },
        ],
      };
    });
  }, [studentProfile, studentWelcome]);

  const buildDeveloperContext = () => {
    let context = '';
    if (rootPath) {
      context += `\nCurrent Project Path: ${rootPath}\n`;
    }
    if (activeFile) {
      context += `\nCurrently Editing: ${activeFile.name} (${activeFile.path})\n`;
      context += `File Content:\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\`\n`;
    }

    if (fileTree.length > 0) {
      const flattenTree = (nodes: FileNode[], depth = 0): string => {
        let result = '';
        for (const node of nodes) {
          result += `${'  '.repeat(depth)}- ${node.name} (${node.type})\n`;
          if (node.children) {
            result += flattenTree(node.children, depth + 1);
          }
        }
        return result;
      };
      context += `\nProject Structure:\n${flattenTree(fileTree)}\n`;
    }

    return context;
  };

  const handleApply = async (path: string, content: string) => {
    if (isStudentMode) {
      return;
    }

    let fullPath = path;
    if (rootPath && !path.startsWith('/') && !path.match(/^[a-zA-Z]:[/\\]/)) {
      const cleanPath = path.replace(/^[/\\]+/, '');
      fullPath = `${rootPath.replace(/[/\\]$/, '')}/${cleanPath}`;
    }
    await onApplyCode(fullPath, content);
  };

  const appendMessage = (mode: ChatMode, message: ChatMessage) => {
    setMessagesByMode((current) => ({
      ...current,
      [mode]: [...(current[mode] ?? INITIAL_MESSAGES[mode]), message],
    }));
  };

  const updateMessageContent = (mode: ChatMode, messageId: string, updater: (current: string) => string) => {
    setMessagesByMode((current) => ({
      ...current,
      [mode]: (current[mode] ?? INITIAL_MESSAGES[mode]).map((message) => (
        message.id === messageId ? { ...message, content: updater(message.content) } : message
      )),
    }));
  };

  const handleSubmit = async (presetInput?: string) => {
    const nextInput = (presetInput ?? input).trim();
    if (!nextInput || isLoading || needsOnboarding) {
      return;
    }

    const modeAtSubmit = aiMode;
    const userMessage = createMessage('user', nextInput);
    const websiteMeta = detectWebsiteGenerationMeta(nextInput);
    appendMessage(modeAtSubmit, userMessage);
    setInput('');
    setIsLoading(true);

    let fullPrompt = '';
    if (modeAtSubmit === 'developer') {
      const prebuiltWebsiteProject = rootPath && shouldUsePrebuiltWebsiteFlow(nextInput)
        ? buildPrebuiltWebsiteProject(nextInput, rootPath)
        : null;

      if (!rootPath && shouldUsePrebuiltWebsiteFlow(nextInput)) {
        appendMessage(
          modeAtSubmit,
          createMessage('assistant', 'Open a workspace folder first so I can save the website files and open the generated site locally.'),
        );
        setIsLoading(false);
        return;
      }

      if (prebuiltWebsiteProject) {
        const assistantMessage = createMessage('assistant', '');
        appendMessage(modeAtSubmit, assistantMessage);
        setIsLoading(true);

        setWebsiteMetaByMessage((current) => ({
          ...current,
          [assistantMessage.id]: prebuiltWebsiteProject.websiteMeta,
        }));

        try {
          const generationTranscript = buildWebsiteGenerationTranscript(
            prebuiltWebsiteProject.siteTitle,
            prebuiltWebsiteProject.outputDirectory,
            prebuiltWebsiteProject.files,
          );
          const generationChunks = createSimulatedGenerationChunks(generationTranscript);
          const generationDuration = getWebsiteSimulationDuration(prebuiltWebsiteProject.files);
          const chunkDelays = getChunkDelaySequence(generationChunks, generationDuration);

          for (let index = 0; index < generationChunks.length; index += 1) {
            const chunk = generationChunks[index];
            updateMessageContent(
              modeAtSubmit,
              assistantMessage.id,
              (currentContent) => {
                const updatedContent = `${currentContent}${chunk}`;
                previewLatestGeneratedFile(updatedContent, onLivePreview);
                return updatedContent;
              },
            );
            await delay(chunkDelays[index] ?? getChunkDelay(chunk));
          }

          for (const file of prebuiltWebsiteProject.files) {
            await onApplyCode(file.path, file.content);
            await delay(60);
          }

          await window.electronAPI?.openLocalFile(prebuiltWebsiteProject.entryFilePath);

          setWebsiteMetaByMessage((current) => ({
            ...current,
            [assistantMessage.id]: {
              ...prebuiltWebsiteProject.websiteMeta,
              autoApplied: true,
            },
          }));
        } catch (error) {
          updateMessageContent(
            modeAtSubmit,
            assistantMessage.id,
            (currentContent) => `${currentContent}\n\nCould not finish saving or opening the prebuilt site: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        } finally {
          setIsLoading(false);
        }

        return;
      }

      fullPrompt = `${buildDeveloperContext()}\nUser Query: ${nextInput}`;
      fullPrompt += "\nCRITICAL: When writing code, you MUST use '// FILE: absolute_path' as the FIRST line inside EVERY code block for creating or editing files. Do not output this tag for regular conversational text.";
      if (websiteMeta.isWebsiteRequest) {
        fullPrompt += '\nWEBSITE MODE: Build a polished but BASIC frontend-only website demo that works as static files when opened locally in a browser. Prefer index.html + styles.css + script.js unless the user explicitly requested a framework. Do not include backend logic, fake integrations, or production claims.';
      }
      if (websiteMeta.isBasicWebsite) {
        fullPrompt += '\nBASIC WEBSITE REQUEST: Keep the implementation intentionally lightweight, static, and easy to open locally after saving.';
      }
    } else {
      fullPrompt = `Student Request: ${nextInput}`;
    }

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const assistantMessage = createMessage('assistant', '');
      if (modeAtSubmit === 'developer' && websiteMeta.isWebsiteRequest) {
        setWebsiteMetaByMessage((current) => ({
          ...current,
          [assistantMessage.id]: {
            ...websiteMeta,
          },
        }));
      }
      appendMessage(modeAtSubmit, assistantMessage);

      const stream = generateResponseStream(
        fullPrompt,
        selectedModel,
        {
          mode: modeAtSubmit,
          isPlanningMode,
          studentProfile,
        },
        controller.signal,
      );

      for await (const chunk of stream) {
        updateMessageContent(modeAtSubmit, assistantMessage.id, (currentContent) => {
          const updatedContent = currentContent + chunk;
          if (modeAtSubmit === 'developer') {
            previewLatestGeneratedFile(updatedContent, (rawPath, codeContent) => {
              let fullPath = rawPath;
              if (rootPath && !rawPath.startsWith('/') && !rawPath.match(/^[a-zA-Z]:[/\\]/)) {
                const cleanPath = rawPath.replace(/^[/\\]+/, '');
                fullPath = `${rootPath.replace(/[/\\]$/, '')}/${cleanPath}`;
              }

              onLivePreview(fullPath, codeContent);
            });
          }

          return updatedContent;
        });
      }
    } catch (error: unknown) {
      const nextError = error as { name?: string };
      if (nextError.name === 'AbortError') {
        return;
      }

      appendMessage(
        modeAtSubmit,
        createMessage(
          'assistant',
          'Could not connect to Ollama. Make sure it is running:\n\n```bash\nollama serve\nollama pull gemma:2b\n```',
        ),
      );
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleStudentProfileSave = (profile: StudentProfile) => {
    onStudentProfileChange(profile);
    setIsEditingProfile(false);
  };

  return (
    <div className={`flex h-full w-full min-w-0 flex-col border-l ${isStudentMode ? 'border-[#e6d39e] bg-[#fffdf6]' : 'border-[#3c3c3c] bg-[#1e1e1e]'}`}>
      <AIChatHeader aiMode={aiMode} studentProfile={studentProfile} onModeChange={onAiModeChange} onClose={onClose} />

      {needsOnboarding || isEditingProfile ? (
        <div className="flex-1 overflow-y-auto">
          <StudentOnboardingCard
            initialProfile={studentProfile}
            onSave={handleStudentProfileSave}
            onCancelEdit={isEditingProfile ? () => setIsEditingProfile(false) : undefined}
            isEditing={isEditingProfile}
          />
          {!needsOnboarding && studentProfile ? (
            <div className="mx-3 mt-3 rounded-2xl border border-[#f0ddb0] bg-white px-4 py-3 text-sm text-[#7b5b1f] shadow-sm">
              Profile updates will be used for future answers and lesson suggestions immediately.
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <>
          {isStudentMode ? (
            <div className="border-b border-[#f0ddb0] bg-[#fff7dc] px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-[#7b5b1f]">
                  Learning as <span className="font-semibold">{studentProfile?.name}</span> in class <span className="font-semibold">{studentProfile?.grade}</span> following <span className="font-semibold">{studentProfile?.syllabus}</span>.
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="rounded-full border border-[#e3d39e] px-3 py-1 text-xs font-medium text-[#7b5b1f] hover:bg-white/80"
                >
                  Edit profile
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {STUDENT_STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => handleSubmit(starter)}
                    className="rounded-full border border-[#e3d39e] bg-white px-3 py-1.5 text-xs text-[#7b5b1f] hover:bg-[#fffdf7]"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <AIMessageList
            aiMode={aiMode}
            messages={messages}
            copied={copied}
            activeFile={activeFile}
            rootPath={rootPath}
            onApply={handleApply}
            onCopy={handleCopy}
            websiteMetaByMessage={websiteMetaByMessage}
          />
          <div ref={messagesEndRef} />
        </>
      )}

      {!needsOnboarding || !isStudentMode ? (
        <AIComposer
          aiMode={aiMode}
          input={input}
          isLoading={isLoading}
          isPlanningMode={isPlanningMode}
          models={models}
          selectedModel={selectedModel}
          onInputChange={setInput}
          onSubmit={() => handleSubmit()}
          onTogglePlanningMode={() => setIsPlanningMode((current) => !current)}
          onModelChange={setSelectedModel}
          onStop={() => abortController?.abort()}
        />
      ) : null}
    </div>
  );
}
