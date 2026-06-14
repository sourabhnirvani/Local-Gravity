import { CheckCircle2, Circle, Loader2, ListTodo } from 'lucide-react';
import { TaskItem } from '../services/agentLoop';

interface TaskListPanelProps {
  tasks: TaskItem[];
}

export default function TaskListPanel({ tasks }: TaskListPanelProps) {
  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-[#2a2a32] bg-[#16161b] p-3 text-sm">
      <div className="mb-3 flex items-center gap-2 font-medium text-[#cccccc]">
        <ListTodo size={16} className="text-[#8ab4ff]" />
        <span>Agent Tasks</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {task.status === 'pending' && <Circle size={14} className="text-[#6f7192]" />}
              {task.status === 'in_progress' && <Loader2 size={14} className="animate-spin text-[#3b82f6]" />}
              {task.status === 'done' && <CheckCircle2 size={14} className="text-green-500" />}
            </div>
            <div className={`flex-1 leading-snug ${task.status === 'done' ? 'text-[#8b91aa] line-through' : 'text-[#cccccc]'}`}>
              {task.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
