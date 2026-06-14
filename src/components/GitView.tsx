import { useState, useEffect } from 'react';
import { GitBranch, GitCommit, Plus, RefreshCw } from 'lucide-react';

export default function GitView() {
  const [status, setStatus] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const result = await window.git?.status();
      setStatus(result || '');
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleAdd = async (file: string) => {
    await window.git?.add(file);
    fetchStatus();
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setLoading(true);
    await window.git?.commit(commitMessage);
    setCommitMessage('');
    await fetchStatus();
    setLoading(false);
  };

  const files = status.split('\n').filter(Boolean).map(line => {
    const code = line.substring(0, 2);
    const file = line.substring(3);
    return { code, file };
  });

  return (
    <div className="flex flex-col h-full bg-[#1a1a1f] text-[#cccccc] text-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[#bbbbbb] font-medium tracking-wide text-xs uppercase">
          <GitBranch size={14} />
          <span>Source Control</span>
        </div>
        <button onClick={fetchStatus} className="p-1 hover:bg-[#2a2a32] rounded">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="mb-4">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Message (Ctrl+Enter to commit)"
          className="w-full bg-[#0e0e11] border border-[#2a2a32] rounded p-2 text-xs text-[#cccccc] outline-none placeholder:text-[#555577] resize-none h-20"
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === 'Enter') handleCommit();
          }}
        />
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || loading || files.length === 0}
          className="w-full mt-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-[#2a2a32] disabled:text-[#6f7192] text-white flex items-center justify-center gap-2 py-1.5 rounded transition-colors"
        >
          <GitCommit size={14} />
          Commit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="text-xs text-[#858585] mb-2 uppercase font-medium">Changes ({files.length})</div>
        {files.length === 0 ? (
          <div className="text-xs text-[#6f7192] italic">No changes detected.</div>
        ) : (
          <div className="space-y-1">
            {files.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between group px-2 py-1 hover:bg-[#2a2a32] rounded">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs ${item.code.includes('M') ? 'text-yellow-400' : 'text-green-400'}`}>
                    {item.code.trim()}
                  </span>
                  <span className="truncate text-xs">{item.file}</span>
                </div>
                <button
                  onClick={() => handleAdd(item.file)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-[#8b91aa] transition-opacity"
                  title="Stage Changes"
                >
                  <Plus size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
