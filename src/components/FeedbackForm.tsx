import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Send } from 'lucide-react';

interface FeedbackFormProps {
  onClose?: () => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function FeedbackForm({ onClose }: FeedbackFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!message.trim()) {
      setStatus('error');
      setErrorMessage('Message is required.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const result = await window.feedback?.send({ name, email, message });
      if (result?.success) {
        setStatus('success');
        setName('');
        setEmail('');
        setMessage('');
        return;
      }

      setStatus('error');
      setErrorMessage(result?.error ?? 'Failed to send feedback.');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred.');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <CheckCircle size={40} className="text-green-400" />
        <p className="text-base font-medium text-[#cccccc]">Feedback sent successfully</p>
        <p className="text-sm text-[#858585]">Thanks for helping improve LocalGravity.</p>
        <button onClick={() => setStatus('idle')} className="text-xs text-[#3b82f6] hover:underline">
          Send another
        </button>
        {onClose && (
          <button onClick={onClose} className="text-xs text-[#858585] hover:text-white">
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#858585]">
          Name <span className="text-[#555]">(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          className="w-full rounded-md border border-[#2a2a32] bg-[#0e0e11] px-3 py-2 text-sm text-[#cccccc] placeholder-[#444] transition-colors focus:border-[#3b82f6] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[#858585]">
          Email <span className="text-[#555]">(optional)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-md border border-[#2a2a32] bg-[#0e0e11] px-3 py-2 text-sm text-[#cccccc] placeholder-[#444] transition-colors focus:border-[#3b82f6] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[#858585]">
          Message <span className="text-red-400">*</span>
        </label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Describe your feedback, bug report, or feature request"
          rows={5}
          className="w-full resize-none rounded-md border border-[#2a2a32] bg-[#0e0e11] px-3 py-2 text-sm text-[#cccccc] placeholder-[#444] transition-colors focus:border-[#3b82f6] focus:outline-none"
        />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle size={14} />
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="flex items-center justify-center gap-2 rounded-md bg-[#3b82f6] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === 'loading' ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send size={15} />
            Send Feedback
          </>
        )}
      </button>
    </form>
  );
}
