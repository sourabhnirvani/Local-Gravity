import { Sparkles, X } from 'lucide-react';

interface AIChatHeaderProps {
  onClose: () => void;
}

export default function AIChatHeader({ onClose }: AIChatHeaderProps) {
  return (
    <div className="border-b border-[#3c3c3c] bg-[#252526] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#007acc] text-white">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#cccccc]">
                AI Chat
              </div>
              <div className="text-xs text-[#858585]">
                Code, debug, and build with your local model
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[#858585] transition-colors hover:bg-[#3c3c3c] hover:text-[#cccccc]"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
