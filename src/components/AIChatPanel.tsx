import { useEffect, useRef, useState } from 'react';
import AIChatHeader from './AIChatHeader';
import AIComposer from './AIComposer';
import AIMessageList from './AIMessageList';
import { generateResponseStream, getLocalModels, OllamaModelInfo } from '../services/ollama';
import { ChatMessage, FileNode, OpenFile } from '../types';
import { runAgent, AgentStep, TaskItem, PendingFileChange, revertPendingChanges } from '../services/agentLoop';
import AgentStepView from './AgentStepView';
import PendingChangesBar from './PendingChangesBar';
import TaskListPanel from './TaskListPanel';

interface AIChatPanelProps {
  onClose: () => void;
  onApplyCode: (path: string, content: string) => Promise<void> | void;
  onLivePreview: (path: string, content: string) => void;
  rootPath: string | null;
  fileTree: FileNode[];
  activeFile?: OpenFile;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'developer-welcome',
    role: 'assistant',
    content: "Hi! I'm your AI Assistant. I can read, write, and create files in your project.\n\nI can also automatically execute terminal commands to run scripts, push edits, manage files, and help you build your project seamlessly.",
  },
];

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
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
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemma3:4b');
  const [isPlanningMode, setIsPlanningMode] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [taskList, setTaskList] = useState<TaskItem[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingFileChange>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    let fullPath = path;
    if (rootPath && !path.startsWith('/') && !path.match(/^[a-zA-Z]:[/\\]/)) {
      const cleanPath = path.replace(/^[/\\]+/, '');
      fullPath = `${rootPath.replace(/[/\\]$/, '')}/${cleanPath}`;
    }
    await onApplyCode(fullPath, content);
  };

  const appendMessage = (message: ChatMessage) => {
    setMessages((current) => [...current, message]);
  };

  const updateMessageContent = (messageId: string, updater: (current: string) => string) => {
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, content: updater(message.content) } : message
    )));
  };

  const handleSubmit = async (presetInput?: string) => {
    const nextInput = (presetInput ?? input).trim();
    if (!nextInput || isLoading) {
      return;
    }

    const userMessage = createMessage('user', nextInput);
    appendMessage(userMessage);
    setInput('');
    setIsLoading(true);

    const fullPrompt = `${buildDeveloperContext()}\nUser Query: ${nextInput}\nCRITICAL: When writing code, you MUST use '// FILE: absolute_path' as the FIRST line inside EVERY code block for creating or editing files. Do not output this tag for regular conversational text. When you want to execute a command, use '// COMMAND: command' in a bash code block.`;

    const controller = new AbortController();
    setAbortController(controller);

    if (isAgentMode) {
      try {
        const result = await runAgent({
          messages: [...messages, userMessage],
          model: selectedModel,
          rootPath: rootPath || '',
          signal: controller.signal,
          pendingChanges,
          onStep: (step) => setAgentSteps((current) => {
            const existingIndex = current.findIndex(s => s.id === step.id);
            if (existingIndex >= 0) {
              const newSteps = [...current];
              newSteps[existingIndex] = step;
              return newSteps;
            }
            return [...current, step];
          }),
          onTaskList: (tasks) => setTaskList(tasks),
        });
        const mappedMessages: ChatMessage[] = result.messages.map((m: any, i: number) => ({
          ...m,
          id: m.id || `agent-msg-${i}-${Date.now()}`
        }));
        setMessages(mappedMessages);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          appendMessage(createMessage('assistant', `Agent error: ${e.message}`));
        }
      } finally {
        setIsLoading(false);
        setAbortController(null);
      }
      return;
    }

    try {
      const assistantMessage = createMessage('assistant', '');
      appendMessage(assistantMessage);

      const stream = generateResponseStream(
        fullPrompt,
        selectedModel,
        {
          isPlanningMode,
        },
        controller.signal,
      );

      for await (const chunk of stream) {
        updateMessageContent(assistantMessage.id, (currentContent) => {
          const updatedContent = currentContent + chunk;
          previewLatestGeneratedFile(updatedContent, (rawPath, codeContent) => {
            let fullPath = rawPath;
            if (rootPath && !rawPath.startsWith('/') && !rawPath.match(/^[a-zA-Z]:[/\\]/)) {
              const cleanPath = rawPath.replace(/^[/\\]+/, '');
              fullPath = `${rootPath.replace(/[/\\]$/, '')}/${cleanPath}`;
            }

            onLivePreview(fullPath, codeContent);
          });

          return updatedContent;
        });
      }
    } catch (error: unknown) {
      const nextError = error as { name?: string };
      if (nextError.name === 'AbortError') {
        return;
      }

      appendMessage(
        createMessage(
          'assistant',
          'Could not connect to Ollama. Make sure it is running:\n\n```bash\nollama serve\nollama pull gemma3:4b\n```',
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

  const handleCommandResult = (stdout: string, stderr: string) => {
    let responseText = '';
    if (stdout.trim()) {
      responseText += `Command stdout:\n\`\`\`text\n${stdout}\n\`\`\`\n`;
    }
    if (stderr.trim()) {
      responseText += `Command stderr:\n\`\`\`text\n${stderr}\n\`\`\`\n`;
    }
    if (!responseText) {
      responseText = "Command executed successfully with no output.";
    }

    appendMessage(createMessage('user', responseText));
    handleSubmit("Analyze the command output and proceed with the next steps.");
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col border-l border-[#3c3c3c] bg-[#1e1e1e]">
      <AIChatHeader onClose={onClose} />

      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 relative">
        <TaskListPanel tasks={taskList} />
        
        <AIMessageList 
          messages={messages} 
          copied={copied}
          activeFile={activeFile}
          rootPath={rootPath}
          onApply={handleApply}
          onCopy={handleCopy}
          onCommandResult={handleCommandResult}
        />

        {agentSteps.map(step => (
          <AgentStepView key={step.id} step={step} />
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      <PendingChangesBar 
        changes={pendingChanges}
        onAcceptAll={() => setPendingChanges(new Map())}
        onRejectAll={() => {
          revertPendingChanges(rootPath || '', pendingChanges).then(() => {
            setPendingChanges(new Map());
          });
        }}
      />
      <AIComposer
        input={input}
        isLoading={isLoading}
        isPlanningMode={isPlanningMode}
        models={models}
        selectedModel={selectedModel}
        isAgentMode={isAgentMode}
        onAgentModeChange={setIsAgentMode}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onTogglePlanningMode={() => setIsPlanningMode(!isPlanningMode)}
        onModelChange={setSelectedModel}
        onStop={() => abortController?.abort()}
      />
    </div>
  );
}
