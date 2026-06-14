import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalSquare } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

export default function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#111318',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264F78',
      },
      fontFamily: 'Consolas, monospace',
      fontSize: 14,
      cursorBlink: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initialize backend terminal
    window.runtime?.initTerminal?.();

    const cleanupData = window.runtime?.onTerminalData?.((data: string) => {
      term.write(data);
    });

    term.onData((data) => {
      window.runtime?.sendTerminalInput?.(data);
    });

    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims) {
          window.runtime?.resizeTerminal?.(dims.cols, dims.rows);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Initial resize to sync with backend
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      cleanupData?.();
      term.dispose();
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-[#111318]">
      <div className="flex h-9 items-center border-b border-[#2a2a32] bg-[#1a1a1f] px-4 text-xs text-[#858585]">
        <TerminalSquare size={14} className="mr-2" />
        <span>TERMINAL</span>
      </div>
      <div className="flex-1 overflow-hidden p-2" ref={terminalRef}></div>
    </div>
  );
}
