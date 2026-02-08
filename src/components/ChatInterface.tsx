import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { generateResponse } from '../services/ollama';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatInterfaceProps {
    onCodeGenerated: (code: string) => void;
}

function ChatInterface({ onCodeGenerated }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hello! I'm your local AI assistant powered by Gemma 2B. I can help you write code, explain concepts, or assist with your projects. What would you like to work on today?",
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

        try {
            const response = await generateResponse(input.trim());

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
            };

            setMessages((prev) => [...prev, assistantMessage]);

            // Extract code blocks if any
            const codeMatch = response.match(/```[\s\S]*?```/g);
            if (codeMatch) {
                const code = codeMatch[0].replace(/```\w*\n?/g, '').replace(/```$/g, '');
                onCodeGenerated(code);
            }
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `⚠️ Error connecting to Ollama. Make sure Ollama is running with Gemma 2B model.\n\nRun: \`ollama serve\` and \`ollama pull gemma:2b\``,
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const formatMessage = (content: string) => {
        // Simple code block detection and formatting
        const parts = content.split(/(```[\s\S]*?```)/g);
        return parts.map((part, index) => {
            if (part.startsWith('```')) {
                const code = part.replace(/```\w*\n?/g, '').replace(/```$/g, '');
                return (
                    <pre key={index} className="code-block p-4 my-2 text-sm overflow-x-auto">
                        <code>{code}</code>
                    </pre>
                );
            }
            // Handle inline code
            const inlineParts = part.split(/(`[^`]+`)/g);
            return inlineParts.map((inline, i) => {
                if (inline.startsWith('`') && inline.endsWith('`')) {
                    return (
                        <code key={`${index}-${i}`} className="bg-cursor-border px-1.5 py-0.5 rounded text-cursor-accent text-sm">
                            {inline.slice(1, -1)}
                        </code>
                    );
                }
                return inline;
            });
        });
    };

    return (
        <div className="flex-1 flex flex-col bg-cursor-bg">
            {/* Chat Header */}
            <div className="h-12 border-b border-cursor-border flex items-center px-4">
                <span className="text-cursor-text font-medium">AI Assistant</span>
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                    Gemma 2B
                </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex gap-3 animate-fadeIn ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        {/* Avatar */}
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user'
                                    ? 'bg-cursor-accent'
                                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                                }`}
                        >
                            {message.role === 'user' ? (
                                <User size={16} className="text-white" />
                            ) : (
                                <Bot size={16} className="text-white" />
                            )}
                        </div>

                        {/* Message Content */}
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                                    ? 'bg-cursor-accent text-white'
                                    : 'bg-cursor-sidebar border border-cursor-border'
                                }`}
                        >
                            <div className="text-sm whitespace-pre-wrap">{formatMessage(message.content)}</div>
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex gap-3 animate-fadeIn">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <Bot size={16} className="text-white" />
                        </div>
                        <div className="bg-cursor-sidebar border border-cursor-border rounded-lg p-3">
                            <Loader2 className="w-5 h-5 animate-spin text-cursor-accent" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-cursor-border">
                <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything... (Shift+Enter for new line)"
                            className="w-full bg-cursor-sidebar border border-cursor-border rounded-lg px-4 py-3 text-cursor-text placeholder-cursor-muted resize-none focus:outline-none focus:border-cursor-accent transition-smooth"
                            rows={1}
                            style={{ minHeight: '48px', maxHeight: '200px' }}
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="w-12 h-12 bg-cursor-accent hover:bg-blue-500 disabled:bg-cursor-border disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-smooth"
                    >
                        <Send size={18} className="text-white" />
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ChatInterface;
