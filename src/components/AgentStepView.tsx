import { useState } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { AgentStep } from '../services/agentLoop';

interface AgentStepViewProps {
  step: AgentStep;
}

export default function AgentStepView({ step }: AgentStepViewProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatArgs = (args: Record<string, unknown>) => {
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return String(args);
    }
  };

  return (
    <div className="mb-2 overflow-hidden rounded border border-[#2a2a32] bg-[#1a1a1f] text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#25252b]"
      >
        <span className="text-[#6f7192]">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="flex-1 font-mono text-[#bbbbbb]">{step.summary}</span>
        <span>
          {step.status === 'running' && <Loader2 size={14} className="animate-spin text-[#3b82f6]" />}
          {step.status === 'done' && <CheckCircle2 size={14} className="text-green-500" />}
          {step.status === 'error' && <XCircle size={14} className="text-red-500" />}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-[#2a2a32] bg-[#0e0e11] p-3 font-mono text-[10px] text-[#8b91aa]">
          <div className="mb-2">
            <span className="font-semibold text-[#8ab4ff]">Tool:</span> {step.tool}
          </div>
          <div className="mb-2">
            <span className="font-semibold text-[#8ab4ff]">Arguments:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-[#16161b] p-2 text-[#cccccc]">
              {formatArgs(step.args)}
            </pre>
          </div>
          {step.detail && (
            <div>
              <span className="font-semibold text-[#8ab4ff]">Output:</span>
              <pre className="mt-1 max-h-48 overflow-y-auto overflow-x-auto rounded bg-[#16161b] p-2 text-[#cccccc] whitespace-pre-wrap">
                {step.detail}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
