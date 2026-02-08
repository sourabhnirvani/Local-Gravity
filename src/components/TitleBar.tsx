import { Minus, Square, X, LayoutGrid } from 'lucide-react';

declare global {
    interface Window {
        electronAPI?: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
        };
    }
}

function TitleBar() {
    return (
        <div className="h-8 bg-[#323233] border-b border-[#252526] flex items-center justify-between drag-region">
            {/* Left - Menu */}
            <div className="flex items-center h-full">
                <div className="w-12 h-full flex items-center justify-center no-drag hover:bg-[#ffffff1a]">
                    <LayoutGrid size={16} className="text-[#cccccc]" />
                </div>
                <div className="flex items-center gap-3 px-2 text-xs text-[#cccccc] no-drag">
                    <span className="hover:bg-[#ffffff1a] px-2 py-1 rounded cursor-pointer">File</span>
                    <span className="hover:bg-[#ffffff1a] px-2 py-1 rounded cursor-pointer">Edit</span>
                    <span className="hover:bg-[#ffffff1a] px-2 py-1 rounded cursor-pointer">View</span>
                    <span className="hover:bg-[#ffffff1a] px-2 py-1 rounded cursor-pointer">Go</span>
                    <span className="hover:bg-[#ffffff1a] px-2 py-1 rounded cursor-pointer">Run</span>
                    <span className="hover:bg-[#ffffff1a] px-2 py-1 rounded cursor-pointer">Help</span>
                </div>
            </div>

            {/* Center - Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-xs text-[#cccccc]">
                LocalGravity - Powered by Gemma 2B
            </div>

            {/* Right - Window Controls */}
            <div className="flex items-center h-full no-drag">
                <button
                    onClick={() => window.electronAPI?.minimize()}
                    className="w-12 h-full flex items-center justify-center hover:bg-[#ffffff1a]"
                >
                    <Minus size={16} className="text-[#cccccc]" />
                </button>
                <button
                    onClick={() => window.electronAPI?.maximize()}
                    className="w-12 h-full flex items-center justify-center hover:bg-[#ffffff1a]"
                >
                    <Square size={12} className="text-[#cccccc]" />
                </button>
                <button
                    onClick={() => window.electronAPI?.close()}
                    className="w-12 h-full flex items-center justify-center hover:bg-[#e81123]"
                >
                    <X size={16} className="text-[#cccccc]" />
                </button>
            </div>
        </div>
    );
}

export default TitleBar;
