import { GraduationCap, Sparkles, X } from 'lucide-react';
import { ChatMode, StudentProfile } from '../types';

interface AIChatHeaderProps {
  aiMode: ChatMode;
  studentProfile: StudentProfile | null;
  onModeChange: (mode: ChatMode) => void;
  onClose: () => void;
}

export default function AIChatHeader({ aiMode, studentProfile, onModeChange, onClose }: AIChatHeaderProps) {
  const isStudentMode = aiMode === 'student';

  return (
    <div className={`border-b px-3 py-3 ${isStudentMode ? 'border-[#d6c68c] bg-[linear-gradient(135deg,#fff7dc,#f4ebc6)]' : 'border-[#3c3c3c] bg-[#252526]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isStudentMode ? 'bg-[#d78928] text-white' : 'bg-[#007acc] text-white'}`}>
              {isStudentMode ? <GraduationCap size={16} /> : <Sparkles size={16} />}
            </div>
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${isStudentMode ? 'text-[#5a3907]' : 'text-[#cccccc]'}`}>
                {isStudentMode ? 'Student Learning Mode' : 'AI Chat'}
              </div>
              <div className={`text-xs ${isStudentMode ? 'text-[#7b5b1f]' : 'text-[#858585]'}`}>
                {isStudentMode && studentProfile
                  ? `${studentProfile.name} • Class ${studentProfile.grade} • ${studentProfile.syllabus}`
                  : isStudentMode
                    ? 'Personalized lessons, revision, and practice'
                    : 'Code, debug, and build with your local model'}
              </div>
            </div>
          </div>
        </div>

        <button onClick={onClose} className={`rounded p-1 ${isStudentMode ? 'text-[#7b5b1f] hover:bg-[#f1e5bc]' : 'text-[#858585] hover:bg-[#3c3c3c] hover:text-white'}`}>
          <X size={14} />
        </button>
      </div>

      <div className="mt-3 inline-flex rounded-full p-1 shadow-sm ring-1 ring-inset ring-black/5">
        <button
          type="button"
          onClick={() => onModeChange('developer')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${aiMode === 'developer' ? 'bg-[#007acc] text-white' : 'text-[#666b7d] hover:bg-white/60'}`}
        >
          Developer
        </button>
        <button
          type="button"
          onClick={() => onModeChange('student')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${aiMode === 'student' ? 'bg-[#d78928] text-white' : 'text-[#7b5b1f] hover:bg-white/60'}`}
        >
          Student
        </button>
      </div>
    </div>
  );
}
