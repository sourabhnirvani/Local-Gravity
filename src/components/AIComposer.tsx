import { BrainCircuit, Plus, Send, Square, Zap, Bot } from 'lucide-react';
import { OllamaModelInfo } from '../services/ollama';

interface AIComposerProps {
  input: string;
  isLoading: boolean;
  isPlanningMode: boolean;
  models: OllamaModelInfo[];
  selectedModel: string;
  isAgentMode: boolean;
  onAgentModeChange: (isAgent: boolean) => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onTogglePlanningMode: () => void;
  onModelChange: (model: string) => void;
  onStop: () => void;
}

export default function AIComposer({
  input,
  isLoading,
  isPlanningMode,
  models,
  selectedModel,
  isAgentMode,
  onAgentModeChange,
  onInputChange,
  onSubmit,
  onTogglePlanningMode,
  onModelChange,
  onStop,
}: AIComposerProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="border-t p-3 border-[#3c3c3c] bg-transparent"
    >
      <div className="relative flex flex-col gap-2">
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Ask a question or describe what you want to build..."
          className="w-full resize-none rounded-2xl p-3 pb-12 text-sm outline-none chat-input bg-[#3c3c3c] text-[#cccccc]"
          rows={3}
          disabled={isLoading}
        />

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert('Upload feature coming soon!')}
              className="rounded p-1.5 text-[#858585] transition-colors hover:bg-[#4a4a4a] hover:text-white"
              title="Attach File"
            >
              <Plus size={16} />
            </button>

            <button
              type="button"
              onClick={onTogglePlanningMode}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
                isPlanningMode
                  ? 'border border-[#007acc]/30 bg-[#007acc]/20 text-[#007acc]'
                  : 'text-[#858585] hover:bg-[#4a4a4a] hover:text-[#cccccc]'
              }`}
              title={isPlanningMode ? 'Planning Mode' : 'Fast Mode'}
            >
              {isPlanningMode ? <BrainCircuit size={14} /> : <Zap size={14} />}
              {isPlanningMode ? 'Planning' : 'Fast'}
            </button>

            <select
              value={selectedModel}
              onChange={(event) => onModelChange(event.target.value)}
              className="max-w-[140px] truncate rounded px-2 py-1 text-xs outline-none bg-transparent text-[#858585] hover:text-[#cccccc]"
              title="Select Local Model"
            >
              {models.map((model) => (
                <option key={model.name} value={model.name} className="bg-[#2d2d2d] text-[#cccccc]">
                  {model.name.replace(':latest', '')}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onAgentModeChange(!isAgentMode)}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
                isAgentMode
                  ? 'border border-[#9333ea]/30 bg-[#9333ea]/20 text-[#c084fc]'
                  : 'text-[#858585] hover:bg-[#4a4a4a] hover:text-[#cccccc]'
              }`}
              title={isAgentMode ? 'Disable Agent Mode' : 'Enable Agent Mode'}
            >
              <Bot size={14} />
              Agent
            </button>
          </div>

          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="rounded p-1.5 text-white transition-colors bg-[#cc0000] hover:bg-[#ff0000]"
              title="Stop Generation"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                !input.trim()
                  ? 'cursor-not-allowed bg-[#3c3c3c] text-[#858585]'
                  : 'bg-[#007acc] text-white hover:bg-[#0062a3]'
              }`}
              title="Send Message"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
