import { useMemo } from 'react';
import { diffLines } from 'diff';
import { FilePlus, FileEdit, FileMinus, FileDiff } from 'lucide-react';
import { PendingFileChange } from '../services/agentLoop';

interface PendingChangesBarProps {
  changes: Map<string, PendingFileChange>;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export default function PendingChangesBar({ changes, onAcceptAll, onRejectAll }: PendingChangesBarProps) {
  const changesList = useMemo(() => Array.from(changes.values()), [changes]);

  const calculateStats = (original: string | null, current: string | null) => {
    if (!original && !current) return { added: 0, removed: 0 };
    if (!original) return { added: (current || '').split('\n').length, removed: 0 };
    if (!current) return { added: 0, removed: (original || '').split('\n').length };

    const diff = diffLines(original, current);
    let added = 0;
    let removed = 0;
    
    diff.forEach((part) => {
      if (part.added) added += part.count || 0;
      if (part.removed) removed += part.count || 0;
    });

    return { added, removed };
  };

  if (changesList.length === 0) return null;

  return (
    <div className="flex flex-col border-t border-[#2a2a32] bg-[#1a1a1f] text-xs">
      <div className="flex items-center justify-between p-3 border-b border-[#2a2a32]">
        <div className="flex items-center gap-2 text-[#cccccc] font-medium">
          <FileDiff size={14} className="text-[#3b82f6]" />
          <span>{changesList.length} Files With Changes</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRejectAll}
            className="px-3 py-1 text-[#8b91aa] hover:text-white transition-colors"
          >
            Reject all
          </button>
          <button
            onClick={onAcceptAll}
            className="rounded bg-[#3b82f6] px-3 py-1 text-white hover:bg-[#2563eb] transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
      
      <div className="max-h-48 overflow-y-auto p-2">
        {changesList.map((change) => {
          const stats = calculateStats(change.originalContent, change.currentContent);
          const name = change.path.split(/[/\\]/).pop();

          return (
            <div key={change.path} className="flex items-center gap-3 px-2 py-1.5 hover:bg-[#25252b] rounded">
              {change.type === 'create' && <FilePlus size={14} className="text-green-500 shrink-0" />}
              {change.type === 'edit' && <FileEdit size={14} className="text-blue-400 shrink-0" />}
              {change.type === 'delete' && <FileMinus size={14} className="text-red-500 shrink-0" />}
              
              <div className="flex items-center gap-2 w-16 shrink-0 font-mono text-[10px]">
                {stats.added > 0 && <span className="text-green-500">+{stats.added}</span>}
                {stats.removed > 0 && <span className="text-red-500">-{stats.removed}</span>}
              </div>

              <div className="flex-1 truncate">
                <span className="font-medium text-[#cccccc] mr-2">{name}</span>
                <span className="text-[10px] text-[#6f7192]">{change.path}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
