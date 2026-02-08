import { Copy, Download, Code } from 'lucide-react';

interface EditorPaneProps {
    code: string;
}

function EditorPane({ code }: EditorPaneProps) {
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated-code.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex-1 flex flex-col bg-cursor-bg">
            {/* Editor Header */}
            <div className="h-12 border-b border-cursor-border flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Code size={16} className="text-cursor-accent" />
                    <span className="text-cursor-text font-medium">Generated Code</span>
                </div>
                {code && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="px-3 py-1.5 text-xs bg-cursor-sidebar border border-cursor-border rounded-md text-cursor-muted hover:text-cursor-text hover:border-cursor-accent transition-smooth flex items-center gap-1.5"
                        >
                            <Copy size={12} />
                            Copy
                        </button>
                        <button
                            onClick={handleDownload}
                            className="px-3 py-1.5 text-xs bg-cursor-sidebar border border-cursor-border rounded-md text-cursor-muted hover:text-cursor-text hover:border-cursor-accent transition-smooth flex items-center gap-1.5"
                        >
                            <Download size={12} />
                            Download
                        </button>
                    </div>
                )}
            </div>

            {/* Code Display */}
            <div className="flex-1 overflow-auto p-4">
                {code ? (
                    <pre className="code-block p-4 text-sm overflow-x-auto h-full">
                        <code className="text-cursor-text">{code}</code>
                    </pre>
                ) : (
                    <div className="h-full flex items-center justify-center text-cursor-muted">
                        <div className="text-center">
                            <Code size={48} className="mx-auto mb-4 opacity-30" />
                            <p>No code generated yet.</p>
                            <p className="text-sm mt-1">Ask the AI to write some code!</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default EditorPane;
