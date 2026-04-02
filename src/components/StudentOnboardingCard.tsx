import { FormEvent, useMemo, useState } from 'react';
import { StudentProfile, StudentSyllabus } from '../types';

interface StudentOnboardingCardProps {
  initialProfile: StudentProfile | null;
  onSave: (profile: StudentProfile) => void;
  onCancelEdit?: () => void;
  isEditing?: boolean;
}

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const SYLLABUS_OPTIONS: StudentSyllabus[] = ['CBSE', 'NCERT'];

export default function StudentOnboardingCard({
  initialProfile,
  onSave,
  onCancelEdit,
  isEditing = false,
}: StudentOnboardingCardProps) {
  const [name, setName] = useState(initialProfile?.name ?? '');
  const [grade, setGrade] = useState<StudentProfile['grade']>(initialProfile?.grade ?? 5);
  const [syllabus, setSyllabus] = useState<StudentSyllabus>(initialProfile?.syllabus ?? 'CBSE');
  const [touched, setTouched] = useState(false);

  const error = useMemo(() => {
    if (!touched) {
      return '';
    }

    if (!name.trim()) {
      return 'Please enter the student name.';
    }

    return '';
  }, [name, touched]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);

    if (!name.trim()) {
      return;
    }

    onSave({
      name: name.trim(),
      grade,
      syllabus,
      completedAt: initialProfile?.completedAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="mx-3 mt-3 rounded-2xl border border-[#e3d39e] bg-[linear-gradient(180deg,#fffaf0,#f8efce)] p-4 text-[#5a3907] shadow-sm">
      <div className="text-lg font-semibold">{isEditing ? 'Edit student profile' : 'Welcome to your learning space'}</div>
      <p className="mt-1 text-sm text-[#7b5b1f]">
        Tell the local tutor a little about the student so lessons, examples, and practice sets match their level.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#8c6a1c]">Student name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border border-[#dbc88f] bg-white px-3 py-2 text-sm text-[#3b2504] outline-none focus:border-[#d78928]"
            placeholder="Enter the student's name"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#8c6a1c]">Class</span>
            <select
              value={grade}
              onChange={(event) => setGrade(Number(event.target.value) as StudentProfile['grade'])}
              className="rounded-xl border border-[#dbc88f] bg-white px-3 py-2 text-sm text-[#3b2504] outline-none focus:border-[#d78928]"
            >
              {GRADES.map((value) => (
                <option key={value} value={value}>
                  Class {value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#8c6a1c]">Syllabus</span>
            <select
              value={syllabus}
              onChange={(event) => setSyllabus(event.target.value as StudentSyllabus)}
              className="rounded-xl border border-[#dbc88f] bg-white px-3 py-2 text-sm text-[#3b2504] outline-none focus:border-[#d78928]"
            >
              {SYLLABUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <div className="rounded-xl bg-[#fff1f1] px-3 py-2 text-sm text-[#b42318]">{error}</div> : null}

        <div className="flex items-center gap-2">
          <button type="submit" className="rounded-xl bg-[#d78928] px-4 py-2 text-sm font-semibold text-white hover:bg-[#bf741b]">
            {isEditing ? 'Save profile' : 'Start learning'}
          </button>
          {isEditing && onCancelEdit ? (
            <button type="button" onClick={onCancelEdit} className="rounded-xl border border-[#dbc88f] px-4 py-2 text-sm text-[#7b5b1f] hover:bg-white/80">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
