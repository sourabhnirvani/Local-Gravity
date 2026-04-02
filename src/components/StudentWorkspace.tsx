import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, GraduationCap, MessageSquarePlus, PanelLeftClose, PanelLeftOpen, SendHorizonal, Square } from 'lucide-react';
import StudentOnboardingCard from './StudentOnboardingCard';
import { analyzeQuestionPaper, generateResponseStream, getLocalModels, OllamaModelInfo } from '../services/ollama';
import { ChatMessage, EducationBoard, QuestionPaperSearchFilters, StudentChatSession, StudentProfile } from '../types';

interface StudentWorkspaceProps {
  studentProfile: StudentProfile | null;
  onAiModeChange: (mode: 'developer' | 'student') => void;
  onStudentProfileChange: (profile: StudentProfile | null) => void;
}

const CHAT_STORAGE_KEY = 'localgravity_student_chats_v1';
const ACTIVE_CHAT_STORAGE_KEY = 'localgravity_student_active_chat_v1';
const DEFAULT_MODEL = 'gemma3:4b';

interface PendingQuestionPaperRequest {
  board?: EducationBoard;
  examClass?: 10 | 11 | 12;
  year?: number;
}

function buildSessionId(seed?: string) {
  return `student-chat-${seed ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

function buildWelcomeMessages(studentProfile: StudentProfile): ChatMessage[] {
  return [
    createMessage(
      'assistant',
      `Hi ${studentProfile.name}! I am your study buddy for Class ${studentProfile.grade} ${studentProfile.syllabus}.\n\nAsk for explanations, revision notes, quizzes, summaries, or homework help and I will tailor everything to your level.`,
    ),
  ];
}

function createSession(studentProfile: StudentProfile): StudentChatSession {
  const timestamp = new Date().toISOString();
  return {
    id: buildSessionId(),
    title: 'New chat',
    messages: buildWelcomeMessages(studentProfile),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function sanitizeMessage(content: string) {
  return content.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim();
}

function deriveTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === 'user');
  if (!firstUserMessage) {
    return 'New chat';
  }

  const singleLine = firstUserMessage.content
    .replace(/\s+/g, ' ')
    .replace(/\b(please|show me|give me|i need|can you|could you)\b/gi, '')
    .trim();
  return singleLine.length > 36 ? `${singleLine.slice(0, 36)}...` : singleLine;
}

function formatTimestamp(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function isQuestionPaperRequest(text: string) {
  return /(question paper|previous year paper|previous year question paper|past paper|pyq)/i.test(text);
}

function detectBoard(text: string, studentProfile: StudentProfile | null): EducationBoard | undefined {
  if (/karnataka|sslc/i.test(text)) {
    return 'Karnataka SSLC';
  }

  if (/ii\s*puc|2nd\s*puc|puc/i.test(text)) {
    return 'Karnataka PUC';
  }

  if (/cbse/i.test(text)) {
    return 'CBSE';
  }

  if (studentProfile?.syllabus === 'CBSE') {
    return 'CBSE';
  }

  return undefined;
}

function detectExamClass(text: string, studentProfile: StudentProfile | null, board?: EducationBoard): 10 | 11 | 12 | undefined {
  if (board === 'Karnataka SSLC') {
    return 10;
  }
  if (board === 'Karnataka PUC') {
    return 12;
  }
  if (/class\s*10|10th|sslc/i.test(text)) {
    return 10;
  }
  if (/class\s*11|11th|first\s*puc|1st\s*puc/i.test(text)) {
    return 11;
  }
  if (/class\s*12|12th|ii\s*puc|2nd\s*puc/i.test(text)) {
    return 12;
  }
  if (studentProfile && [10, 11, 12].includes(studentProfile.grade)) {
    return studentProfile.grade as 10 | 11 | 12;
  }
  return undefined;
}

function detectYear(text: string) {
  const match = text.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function detectSubjectQuery(text: string) {
  const cleaned = text
    .replace(/\b(previous year|question paper|past paper|pyq|need|show|give|official|government|board|paper|papers|for|from|please|which|year|subject)\b/gi, ' ')
    .replace(/\b(cbse|karnataka|sslc|ii\s*puc|2nd\s*puc|class\s*10|class\s*11|class\s*12|10th|11th|12th)\b/gi, ' ')
    .replace(/\b20\d{2}\b/g, ' ')
    .replace(/[^\w\s&/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || undefined;
}

function normalizeSession(session: Partial<StudentChatSession>, index: number): StudentChatSession {
  const messages = Array.isArray(session.messages)
    ? session.messages
        .filter(
          (message): message is ChatMessage =>
            Boolean(message && typeof message.content === 'string' && (message.role === 'user' || message.role === 'assistant')),
        )
        .map((message, messageIndex) => ({
          id: typeof message.id === 'string' && message.id ? message.id : `message-${index}-${messageIndex}`,
          role: message.role,
          content: message.content,
        }))
    : [];

  const createdAt = typeof session.createdAt === 'string' && session.createdAt ? session.createdAt : new Date().toISOString();
  const updatedAt = typeof session.updatedAt === 'string' && session.updatedAt ? session.updatedAt : createdAt;

  return {
    id: typeof session.id === 'string' && session.id ? session.id : buildSessionId(`${createdAt}-${index}`),
    title: typeof session.title === 'string' && session.title && session.title !== 'New chat' ? session.title : deriveTitle(messages),
    messages,
    createdAt,
    updatedAt,
  };
}

function normalizeSessions(sessions: Partial<StudentChatSession>[]) {
  const seen = new Set<string>();
  const normalized: StudentChatSession[] = [];

  sessions.forEach((session, index) => {
    const nextSession = normalizeSession(session, index);
    if (!seen.has(nextSession.id)) {
      seen.add(nextSession.id);
      normalized.push(nextSession);
    }
  });

  return normalized.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export default function StudentWorkspace({
  studentProfile,
  onAiModeChange,
  onStudentProfileChange,
}: StudentWorkspaceProps) {
  const [sessions, setSessions] = useState<StudentChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [pendingQuestionPaperRequest, setPendingQuestionPaperRequest] = useState<PendingQuestionPaperRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const normalizedSessions = useMemo(() => normalizeSessions(sessions), [sessions]);

  const activeSession =
    normalizedSessions.find((session) => session.id === activeSessionId) ??
    normalizedSessions[0] ??
    null;
  const messages = activeSession?.messages ?? [];
  const needsOnboarding = !studentProfile;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      const storedActiveSessionId = localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<StudentChatSession>[];
      if (!Array.isArray(parsed)) {
        return;
      }

      const migrated = normalizeSessions(parsed);
      setSessions(migrated);
      setActiveSessionId(
        storedActiveSessionId && migrated.some((session) => session.id === storedActiveSessionId)
          ? storedActiveSessionId
          : migrated[0]?.id ?? null,
      );
    } catch {
      setSessions([]);
      setActiveSessionId(null);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, activeSessionId);
    } else {
      localStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (normalizedSessions.length === 0) {
      if (activeSessionId !== null) {
        setActiveSessionId(null);
      }
      return;
    }

    if (!activeSessionId || !normalizedSessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(normalizedSessions[0].id);
    }
  }, [activeSessionId, normalizedSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchModels = async () => {
      const localModels = await getLocalModels();
      setModels(localModels);
      if (localModels.length > 0 && !localModels.some((model) => model.name === DEFAULT_MODEL)) {
        setSelectedModel(localModels[0].name);
      }
    };

    fetchModels();
  }, []);

  useEffect(() => {
    if (!studentProfile) {
      return;
    }

    setSessions((current) => {
      if (current.length > 0) {
        return current;
      }

      const initialSession = createSession(studentProfile);
      setActiveSessionId(initialSession.id);
      return normalizeSessions([initialSession]);
    });
  }, [studentProfile]);

  const studentSummary = useMemo(() => {
    if (!studentProfile) {
      return '';
    }

    return `${studentProfile.name} | Class ${studentProfile.grade} | ${studentProfile.syllabus}`;
  }, [studentProfile]);

  const createNewChat = () => {
    if (!studentProfile) {
      return;
    }

    const nextSession = createSession(studentProfile);
    setSessions((current) => normalizeSessions([nextSession, ...current]));
    setActiveSessionId(nextSession.id);
    setPendingQuestionPaperRequest(null);
    setInput('');
  };

  const updateSession = (sessionId: string, updater: (session: StudentChatSession) => StudentChatSession) => {
    setSessions((current) =>
      normalizeSessions(current.map((session) => (session.id === sessionId ? updater(session) : session))),
    );
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setPendingQuestionPaperRequest(null);
  };

  const appendAssistantMessage = (sessionId: string, content: string) => {
    updateSession(sessionId, (session) => {
      const nextMessages = [...session.messages, createMessage('assistant', content)];
      return {
        ...session,
        messages: nextMessages,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const resolveQuestionPaperRequest = async (sessionId: string, query: string) => {
    const board = detectBoard(query, studentProfile) ?? pendingQuestionPaperRequest?.board;
    const examClass = detectExamClass(query, studentProfile, board) ?? pendingQuestionPaperRequest?.examClass;
    const year = detectYear(query) ?? pendingQuestionPaperRequest?.year;
    const subjectQuery = detectSubjectQuery(query);

    if (!year || !subjectQuery) {
      setPendingQuestionPaperRequest({ board, examClass, year });
      appendAssistantMessage(
        sessionId,
        'Which year and subject question paper do you need? You can also mention the board, for example: "2024 CBSE Class 10 Science" or "2022 Karnataka SSLC Mathematics".',
      );
      return true;
    }

    setPendingQuestionPaperRequest(null);

    const filters: QuestionPaperSearchFilters = {
      board,
      examClass,
      year,
      subjectQuery,
    };

    const matches = await window.questionPapers?.search(filters);
    if (!matches || matches.length === 0) {
      appendAssistantMessage(
        sessionId,
        `I could not find an official question paper for ${year} ${subjectQuery}${board ? ` under ${board}` : ''}. Try adding the board name, or use one of the currently supported official sources: CBSE, Karnataka SSLC, or Karnataka PUC.`,
      );
      return true;
    }

    const selectedPaper = matches[0];
    const content = await window.questionPapers?.getContent(selectedPaper.id);
    if (!content) {
      appendAssistantMessage(sessionId, 'I found a matching paper, but I could not open it locally just now. Please try again.');
      return true;
    }

    const analysis = await analyzeQuestionPaper(content.paper, content.extractedText, selectedModel, studentProfile);
    appendAssistantMessage(
      sessionId,
      `I found an official paper for ${content.paper.board} ${content.paper.year} ${content.paper.subject}.\n\nSource: ${content.paper.sourceLabel}\nOfficial page: ${content.paper.sourcePageUrl}\nCached locally: ${content.localPath}\n\n${analysis}`,
    );
    return true;
  };

  const handleSend = async (presetInput?: string) => {
    if (!studentProfile || !activeSessionId || isLoading) {
      return;
    }

    const nextInput = (presetInput ?? input).trim();
    if (!nextInput) {
      return;
    }

    const userMessage = createMessage('user', nextInput);
    const updatedAt = new Date().toISOString();

    updateSession(activeSessionId, (session) => {
      const nextMessages = [...session.messages, userMessage];
      return {
        ...session,
        messages: nextMessages,
        title: deriveTitle(nextMessages),
        updatedAt,
      };
    });

    setInput('');
    setIsLoading(true);

    const shouldHandleQuestionPaper = pendingQuestionPaperRequest || isQuestionPaperRequest(nextInput);

    if (shouldHandleQuestionPaper) {
      try {
        await resolveQuestionPaperRequest(activeSessionId, nextInput);
      } catch {
        appendAssistantMessage(
          activeSessionId,
          'I ran into a problem while loading the official question paper. Please try again with the year, subject, and board if possible.',
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const assistantMessage = createMessage('assistant', '');
    updateSession(activeSessionId, (session) => ({
      ...session,
      messages: [...session.messages, assistantMessage],
      updatedAt: new Date().toISOString(),
    }));

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const stream = generateResponseStream(
        `Student Request: ${nextInput}`,
        selectedModel,
        {
          mode: 'student',
          studentProfile,
        },
        controller.signal,
      );

      for await (const chunk of stream) {
        updateSession(activeSessionId, (session) => ({
          ...session,
          messages: session.messages.map((message) =>
            message.id === assistantMessage.id ? { ...message, content: `${message.content}${chunk}` } : message,
          ),
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch (error: unknown) {
      const nextError = error as { name?: string };
      if (nextError.name !== 'AbortError') {
        updateSession(activeSessionId, (session) => ({
          ...session,
          messages: session.messages.map((message) =>
            message.id === assistantMessage.id
              ? {
                  ...message,
                  content: 'Could not connect to the local model. Please make sure Ollama is running and try again.',
                }
              : message,
          ),
          updatedAt: new Date().toISOString(),
        }));
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleProfileSave = (profile: StudentProfile) => {
    onStudentProfileChange(profile);
    setIsEditingProfile(false);
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[radial-gradient(circle_at_top,#fff8de_0%,#fffaf0_35%,#f8f1df_100%)] text-[#362106]">
      <aside
        className={`flex h-full shrink-0 flex-col border-r border-[#ead8a2] bg-[#fff8e3]/95 backdrop-blur transition-all duration-200 ${
          isSidebarCollapsed ? 'w-[76px]' : 'w-[280px]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#efdfaf] px-4 py-4">
          {isSidebarCollapsed ? (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d78928] text-white">
              <GraduationCap size={18} />
            </div>
          ) : (
            <div>
              <div className="text-sm font-semibold text-[#5d3800]">Student Learning</div>
              <div className="mt-1 text-xs text-[#8a672d]">{studentSummary || 'Personalized study mode'}</div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            className="rounded-xl p-2 text-[#946f2c] hover:bg-white/70"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <div className={`border-b border-[#efdfaf] p-3 ${isSidebarCollapsed ? 'space-y-2' : 'space-y-3'}`}>
          <button
            type="button"
            onClick={createNewChat}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d78928] px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#c17821] ${
              isSidebarCollapsed ? 'px-0' : ''
            }`}
          >
            <MessageSquarePlus size={16} />
            {!isSidebarCollapsed ? 'New Chat' : null}
          </button>

          <div className={`rounded-2xl border border-[#ead8a2] bg-white/70 p-1 ${isSidebarCollapsed ? 'flex flex-col' : 'grid grid-cols-2'}`}>
            <button
              type="button"
              onClick={() => onAiModeChange('developer')}
              className="rounded-xl px-3 py-2 text-xs font-medium text-[#7f6634] hover:bg-[#f7f0d7]"
            >
              {isSidebarCollapsed ? <ChevronLeft size={16} className="mx-auto" /> : 'Developer'}
            </button>
            <button
              type="button"
              onClick={() => onAiModeChange('student')}
              className="rounded-xl bg-[#d78928] px-3 py-2 text-xs font-medium text-white shadow-sm"
            >
              {isSidebarCollapsed ? <GraduationCap size={16} className="mx-auto" /> : 'Student'}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {!isSidebarCollapsed ? <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a88743]">Recent chats</div> : null}
          <div className="space-y-2">
            {normalizedSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => handleSelectSession(session.id)}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                  activeSessionId === session.id
                    ? 'border-[#d9b56d] bg-white text-[#4f2f00] shadow-sm'
                    : 'border-transparent bg-transparent text-[#77551b] hover:border-[#ead8a2] hover:bg-white/60'
                }`}
                title={session.title}
              >
                {isSidebarCollapsed ? (
                  <div className="flex justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f9ebc7] text-[#a06c13]">
                      <GraduationCap size={16} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="truncate text-sm font-medium">{session.title}</div>
                    <div className="mt-1 text-xs text-[#9b7b3f]">{formatTimestamp(session.updatedAt)}</div>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[#e7d8a8] bg-white/50 px-6 py-4 backdrop-blur">
          <div>
            <div className="text-sm font-semibold text-[#5c3602]">{studentProfile?.name ?? 'Student'}</div>
            <div className="mt-1 text-xs text-[#8a672d]">
              {studentProfile ? `Class ${studentProfile.grade} | ${studentProfile.syllabus}` : 'Complete profile to personalize learning'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="rounded-full border border-[#e7d8a8] bg-white px-4 py-2 text-xs font-medium text-[#7f6634] shadow-sm hover:bg-[#fffaf0]"
          >
            Edit profile
          </button>
        </div>

        {needsOnboarding || isEditingProfile ? (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-8">
            <div className="w-full max-w-[720px]">
              <StudentOnboardingCard
                initialProfile={studentProfile}
                onSave={handleProfileSave}
                onCancelEdit={isEditingProfile ? () => setIsEditingProfile(false) : undefined}
                isEditing={isEditingProfile}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-8">
                {messages.map((message) => {
                  const cleanedContent = sanitizeMessage(message.content);
                  const isUser = message.role === 'user';

                  return (
                    <div key={message.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-[28px] px-5 py-4 text-[15px] leading-7 shadow-sm ${
                          isUser
                            ? 'bg-[#d78928] text-white'
                            : 'border border-[#ebddb1] bg-white text-[#472a04]'
                        }`}
                      >
                        <div className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isUser ? 'text-white/75' : 'text-[#9b7b3f]'}`}>
                          {isUser ? 'You' : 'Study Buddy'}
                        </div>
                        <div className="whitespace-pre-wrap break-words">{cleanedContent}</div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t border-[#ead8a2] bg-[linear-gradient(180deg,rgba(255,250,240,0.3),#fff8e8)] px-6 py-4">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-[28px] border border-[#ead8a2] bg-white/90 p-4 shadow-[0_20px_45px_rgba(163,123,42,0.08)]">
                <div className="flex items-center justify-between gap-3 text-xs text-[#8a672d]">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#f8ebc7] px-3 py-1 font-medium">{selectedModel.replace(':latest', '')}</span>
                    <span className="rounded-full bg-[#f7f1dc] px-3 py-1">Local model</span>
                  </div>
                  <select
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                    className="rounded-full border border-[#ead8a2] bg-[#fffaf0] px-3 py-1.5 text-xs text-[#7b5b1f] outline-none"
                  >
                    {models.map((model) => (
                      <option key={model.name} value={model.name}>
                        {model.name.replace(':latest', '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-3">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    placeholder="Ask for an explanation, quiz, revision notes, or homework help..."
                    className="min-h-[56px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-[#472a04] outline-none placeholder:text-[#b29865]"
                    disabled={isLoading}
                  />

                  {isLoading ? (
                    <button
                      type="button"
                      onClick={() => abortController?.abort()}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d78928] text-white shadow-sm hover:bg-[#c17821]"
                    >
                      <Square size={16} fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSend()}
                      disabled={!input.trim()}
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm ${
                        input.trim() ? 'bg-[#d78928] hover:bg-[#c17821]' : 'bg-[#eadcb6] text-[#a18b57]'
                      }`}
                    >
                      <SendHorizonal size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
