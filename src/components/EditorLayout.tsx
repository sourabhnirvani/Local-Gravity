import { XCircle } from 'lucide-react';
import AIChatPanel from './AIChatPanel';
import EditorArea from './EditorArea';
import { AppSettings } from '../services/settingsService';
import { ChatMode, FileNode, OpenFile, RunOutputEvent, StudentProfile } from '../types';

interface EditorLayoutProps {
  openFiles: OpenFile[];
  activeFileIndex: number;
  onFileSelect: (index: number) => void;
  onFileClose: (index: number) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  settings: AppSettings;
  showAIPanel: boolean;
  aiPanelWidth: number;
  onStartResize: (event: React.MouseEvent) => void;
  onCloseAIPanel: () => void;
  rootPath: string | null;
  fileTree: FileNode[];
  onApplyCode: (filePath: string, content: string) => Promise<void>;
  onLivePreview: (filePath: string, content: string) => void;
  activeFile?: OpenFile;
  outputLines: RunOutputEvent[];
  outputVisible: boolean;
  runState: 'idle' | 'running' | 'stopped' | 'error';
  onToggleOutput: () => void;
  onClearOutput: () => void;
  aiMode: ChatMode;
  studentProfile: StudentProfile | null;
  onAiModeChange: (mode: ChatMode) => void;
  onStudentProfileChange: (profile: StudentProfile | null) => void;
}

export default function EditorLayout({
  openFiles,
  activeFileIndex,
  onFileSelect,
  onFileClose,
  onContentChange,
  onSave,
  settings,
  showAIPanel,
  aiPanelWidth,
  onStartResize,
  onCloseAIPanel,
  rootPath,
  fileTree,
  onApplyCode,
  onLivePreview,
  activeFile,
  outputLines,
  outputVisible,
  runState,
  onToggleOutput,
  onClearOutput,
  aiMode,
  studentProfile,
  onAiModeChange,
  onStudentProfileChange,
}: EditorLayoutProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <EditorArea
          openFiles={openFiles}
          activeFileIndex={activeFileIndex}
          onFileSelect={onFileSelect}
          onFileClose={onFileClose}
          onContentChange={onContentChange}
          onSave={onSave}
          settings={settings}
        />

        <div className={`border-t border-[#2a2a32] bg-[#0f1014] transition-all ${outputVisible ? 'h-48' : 'h-10'}`}>
          <div className="flex h-10 items-center justify-between px-3 text-xs text-[#cccccc]">
            <div className="flex items-center gap-2">
              <span>Output</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${runState === 'running' ? 'bg-green-500/15 text-green-300' : 'bg-[#2a2a32] text-[#8b91aa]'}`}>
                {runState}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onToggleOutput} className="rounded px-2 py-1 text-[#8b91aa] hover:bg-[#1a1a1f] hover:text-white">
                {outputVisible ? 'Hide' : 'Show'}
              </button>
              <button onClick={onClearOutput} className="rounded px-2 py-1 text-[#8b91aa] hover:bg-[#1a1a1f] hover:text-white">
                Clear
              </button>
            </div>
          </div>

          {outputVisible && (
            <div className="h-[calc(100%-2.5rem)] overflow-auto px-3 pb-3 font-mono text-xs">
              {outputLines.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[#5f667f]">Run a file to see output here.</div>
              ) : (
                outputLines.map((line, index) => (
                  <div
                    key={`${line.type}-${index}`}
                    className={`whitespace-pre-wrap py-0.5 ${
                      line.type === 'stderr' ? 'text-red-300' : line.type === 'system' ? 'text-[#8ab4ff]' : 'text-[#c9d1d9]'
                    }`}
                  >
                    {line.message}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showAIPanel && (
        <>
          <div className="w-1 cursor-col-resize transition-colors hover:bg-[#3b82f6] active:bg-[#3b82f6]" onMouseDown={onStartResize} />
          <div className="relative h-full shrink-0" style={{ width: aiPanelWidth }}>
            <button
              onClick={onCloseAIPanel}
              className="absolute right-3 top-3 z-10 rounded border border-[#2a2a32] bg-[#111318] p-1 text-[#8b91aa] hover:text-white"
              title="Close AI panel"
            >
              <XCircle size={14} />
            </button>
            <AIChatPanel
              onClose={onCloseAIPanel}
              onApplyCode={onApplyCode}
              onLivePreview={onLivePreview}
              rootPath={rootPath}
              fileTree={fileTree}
              activeFile={activeFile}
              aiMode={aiMode}
              studentProfile={studentProfile}
              onAiModeChange={onAiModeChange}
              onStudentProfileChange={onStudentProfileChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
