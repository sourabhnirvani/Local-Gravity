import { BrainCircuit, Plus, Send, Square, Zap } from 'lucide-react';
import { OllamaModelInfo } from '../services/ollama';
import { ChatMode } from '../types';

interface AIComposerProps {
  aiMode: ChatMode;
  input: string;
  isLoading: boolean;
  isPlanningMode: boolean;
  models: OllamaModelInfo[];
  selectedModel: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onTogglePlanningMode: () => void;
  onModelChange: (model: string) => void;
  onStop: () => void;
}

export default function AIComposer({
  aiMode,
  input,
  isLoading,
  isPlanningMode,
  models,
  selectedModel,
  onInputChange,
  onSubmit,
  onTogglePlanningMode,
  onModelChange,
  onStop,
}: AIComposerProps) {
  const isStudentMode = aiMode === 'student';

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className={`border-t p-3 ${isStudentMode ? 'border-[#e3d39e] bg-[#fff9ea]' : 'border-[#3c3c3c] bg-transparent'}`}
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
          placeholder={isStudentMode ? 'Ask for an explanation, practice questions, or revision help...' : 'Ask a question or describe what you want to build...'}
          className={`w-full resize-none rounded-2xl p-3 pb-12 text-sm outline-none ${isStudentMode ? 'border border-[#dbc88f] bg-white text-[#5a3907]' : 'chat-input bg-[#3c3c3c] text-[#cccccc]'}`}
          rows={3}
          disabled={isLoading}
        />

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isStudentMode ? (
              <button
                type="button"
                onClick={() => alert('Upload feature coming soon!')}
                className="rounded p-1.5 text-[#858585] transition-colors hover:bg-[#4a4a4a] hover:text-white"
                title="Attach File"
              >
                <Plus size={16} />
              </button>
            ) : null}

            <button
              type="button"
              onClick={onTogglePlanningMode}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${isPlanningMode
                ? isStudentMode
                  ? 'border border-[#d78928]/30 bg-[#d78928]/15 text-[#9b5b0a]'
                  : 'border border-[#007acc]/30 bg-[#007acc]/20 text-[#007acc]'
                : isStudentMode
                  ? 'text-[#8b6d2d] hover:bg-[#f8edc5] hover:text-[#7b5b1f]'
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
              className={`max-w-[140px] truncate rounded px-2 py-1 text-xs outline-none ${isStudentMode ? 'bg-[#fff4d5] text-[#7b5b1f]' : 'bg-transparent text-[#858585] hover:text-[#cccccc]'}`}
              title="Select Local Model"
            >
              {models.map((model) => (
                <option key={model.name} value={model.name} className={isStudentMode ? 'bg-[#fffaf0] text-[#5a3907]' : 'bg-[#2d2d2d] text-[#cccccc]'}>
                  {model.name.replace(':latest', '')}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className={`rounded p-1.5 text-white transition-colors ${isStudentMode ? 'bg-[#c66a1c] hover:bg-[#ad5913]' : 'bg-[#cc0000] hover:bg-[#ff0000]'}`}
              title="Stop Generation"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${!input.trim()
                ? isStudentMode
                  ? 'cursor-not-allowed bg-[#eadfb5] text-[#9f8c55]'
                  : 'cursor-not-allowed bg-[#3c3c3c] text-[#858585]'
                : isStudentMode
                  ? 'bg-[#d78928] text-white hover:bg-[#bf741b]'
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
