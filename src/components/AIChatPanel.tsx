import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, User, Loader2, Copy, Check, FilePlus, Trash2 } from 'lucide-react';
import { generateResponse } from '../services/ollama';
import { FileNode, OpenFile } from '../types';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface AIChatPanelProps {
    onClose: () => void;
    onCodeGenerated: (code: string) => void;
    rootPath: string | null;
    fileTree: FileNode[];
    activeFile?: OpenFile;
    onSave: () => void;
    width: number;
    onRefreshFileTree?: () => void;
}

function AIChatPanel({ onClose, onCodeGenerated, rootPath, fileTree, activeFile, onSave, width, onRefreshFileTree }: AIChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm Gemma. I can read, write, and create files in your project.\n\nTo create or edit a file, just tell me what to do. I'll provide a code block with the target file path. Click 'Apply' to save the changes.\n\nExample: \"Create a new component called Button.tsx\"",
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const buildContext = () => {
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
        try {
            // Write to file system (handles creation too)
            const success = await window.fileSystem?.writeFile(path, content);

            if (success) {
                // If it's the active file, update editor content too
                if (activeFile && activeFile.path === path) {
                    onCodeGenerated(content);
                    onSave();
                }

                // Refresh file tree
                onRefreshFileTree?.();

                // Show success feedback
                alert(`Success! Saved to ${path}`);
            } else {
                alert(`Failed to save to ${path}`);
            }
        } catch (error) {
            console.error('Failed to apply changes:', error);
            alert(`Error saving file: ${error}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const context = buildContext();
        let fullPrompt = `${context}\nUser Query: ${input.trim()}`;

        // Add specific instruction for file markers in every prompt to reinforce it
        fullPrompt += "\nREMINDER: Use '// FILE: absolute_path' at the start of code blocks to target specific files.";

        try {
            const response = await generateResponse(fullPrompt);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
            };

            setMessages((prev) => [...prev, assistantMessage]);

        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '⚠️ Could not connect to Ollama. Make sure it\'s running:\n\n```bash\nollama serve\nollama pull gemma:2b\n```',
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const formatMessage = (content: string, messageId: string) => {
        const parts = content.split(/(```[\s\S]*?```)/g);
        return parts.map((part, index) => {
            if (part.startsWith('```')) {
                let codeContent = part.replace(/```\w*\n?/g, '').replace(/```$/g, '');
                const language = part.match(/```(\w*)/)?.[1] || '';
                const blockId = `${messageId}-${index}`;

                // Check for FILE marker inside the code block
                let fileMarkerMatch = codeContent.match(/^\/\/ FILE: (.+)(\r?\n|$)/);

                // If not found in code, check the PRECEDING text part
                if (!fileMarkerMatch && index > 0) {
                    const prevPart = parts[index - 1];
                    // Look for the LAST marker in the previous part
                    const matches = [...prevPart.matchAll(/\/\/ FILE: ([^\n]+)/g)];
                    if (matches.length > 0) {
                        const lastMatch = matches[matches.length - 1];
                        // Construct a match-like array [fullString, captureGroup]
                        fileMarkerMatch = [lastMatch[0], lastMatch[1]];
                    }
                }

                let targetPath = null;
                let displayPath = '';

                if (fileMarkerMatch) {
                    targetPath = fileMarkerMatch[1].trim();
                    // Clean up potential trailing punctuation from AI like "."
                    targetPath = targetPath.replace(/[.:]$/, '');
                    displayPath = targetPath.split(/[\\/]/).pop() || targetPath;
                } else if (activeFile) {
                    // Fallback to active file
                    targetPath = activeFile.path;
                    displayPath = activeFile.name;
                }

                // Check for DELETE command
                const deleteMatch = part.match(/^DELETE: (.+)(\r?\n|$)/);
                if (deleteMatch) {
                    const targetPath = deleteMatch[1].trim();
                    const displayPath = targetPath.split(/[\\/]/).pop() || targetPath;
                    return (
                        <div key={index} className="my-2 p-3 rounded-md bg-[#2d2d2d] border border-[#ff4444] text-sm flex items-center justify-between">
                            <span className="text-[#ff9999]">Delete <strong>{displayPath}</strong>?</span>
                            <button
                                onClick={async () => {
                                    if (confirm(`Are you sure you want to delete ${displayPath}?`)) {
                                        await window.fileSystem?.deleteFile(targetPath);
                                        // TODO: Refresh file tree
                                        console.log(`Deleted ${targetPath}`);
                                        alert(`Deleted ${targetPath}`);
                                    }
                                }}
                                className="flex items-center gap-1 text-white bg-[#cc0000] hover:bg-[#ff0000] px-3 py-1 rounded transition-colors"
                            >
                                <Trash2 size={12} />
                                Confirm Delete
                            </button>
                        </div>
                    );
                }

                return (
                    <div key={index} className="my-2 rounded-md overflow-hidden bg-[#1e1e1e] border border-[#3c3c3c]">
                        <div className="flex items-center justify-between px-3 py-1 bg-[#2d2d2d] text-xs text-[#858585]">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span>{language || 'code'}</span>
                                {targetPath && (
                                    <span className="text-[#007acc] truncate max-w-[200px]" title={targetPath}>
                                        {displayPath}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {targetPath && (
                                    <button
                                        onClick={() => handleApply(targetPath!, codeContent)}
                                        className="flex items-center gap-1 text-white bg-[#0e639c] hover:bg-[#1177bb] px-2 py-0.5 rounded transition-colors"
                                        title={`Write to ${targetPath}`}
                                    >
                                        <FilePlus size={12} fill="currentColor" />
                                        Apply
                                    </button>
                                )}
                                <button
                                    onClick={() => copyToClipboard(codeContent, blockId)}
                                    className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded hover:bg-[#3c3c3c] transition-colors"
                                >
                                    {copied === blockId ? <Check size={12} /> : <Copy size={12} />}
                                    {copied === blockId ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                        <pre className="p-3 text-sm overflow-x-auto">
                            <code className="text-[#d4d4d4]">{codeContent}</code>
                        </pre>
                    </div>
                );
            }
            return <span key={index} className="whitespace-pre-wrap break-words min-w-0">{part}</span>;
        });
    };

    return (
        <div style={{ width: width }} className="border-l border-[#3c3c3c] flex flex-col bg-[#1e1e1e] flex-shrink-0">
            {/* Header */}
            <div className="h-10 flex items-center justify-between px-3 bg-[#252526] border-b border-[#3c3c3c]">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#007acc]" />
                    <span className="text-sm text-[#cccccc] font-medium">AI Chat</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white">
                    <X size={14} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                        {/* Avatar */}
                        <div className={`w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-[#3c3c3c]' : 'bg-[#007acc]'
                            }`}>
                            {message.role === 'user' ? (
                                <User size={14} className="text-[#cccccc]" />
                            ) : (
                                <Sparkles size={14} className="text-white" />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 text-sm text-[#cccccc]">
                            <div className="font-medium text-xs text-[#858585] mb-1">
                                {message.role === 'user' ? 'You' : 'AI Assistant'}
                            </div>
                            <div>{formatMessage(message.content, message.id)}</div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-sm bg-[#007acc] flex items-center justify-center">
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#858585]">
                            <Loader2 size={14} className="animate-spin" />
                            <span>Thinking...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-[#3c3c3c]">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        placeholder="Ask a question or describe what you want to build..."
                        className="chat-input pr-10"
                        rows={3}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 bottom-2 p-1.5 bg-[#007acc] hover:bg-[#0062a3] disabled:bg-[#3c3c3c] disabled:cursor-not-allowed rounded"
                    >
                        <Send size={14} className="text-white" />
                    </button>
                </div>
                <div className="mt-2 text-xs text-[#6e6e6e]">
                    Press Enter to send, Shift+Enter for new line
                </div>
            </form>
        </div>
    );
}

export default AIChatPanel;
