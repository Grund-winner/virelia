'use client';

import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/store';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MessageInput() {
  const { activeCompanion, isSending, setSending, addMessages } = useAppStore();
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  const handleSend = async () => {
    if (!message.trim() || !activeCompanion || isSending) return;

    const text = message.trim();
    setMessage('');
    setSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companion_id: activeCompanion.id,
          message: text,
        }),
      });

      const data = await res.json();
      if (data.success) {
        addMessages([data.userMessage, data.aiMessage]);
      }
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeCompanion) return null;

  return (
    <div className="p-3 sm:p-4 bg-white/80 backdrop-blur-xl border-t border-[#E5E4F0]">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Écrire à ${activeCompanion.name}...`}
            rows={1}
            disabled={isSending}
            className="w-full px-4 py-3 rounded-2xl border border-[#E5E4F0] bg-[#F4F5FA] text-[#1E1B4B] placeholder-[#9896BF] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/30 focus:border-[#7C5CFC] resize-none transition-all disabled:opacity-50 text-sm leading-relaxed"
            style={{ maxHeight: '120px' }}
          />
        </div>
        <motion.button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-shadow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-md"
          style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
        >
          <Send className="w-5 h-5 text-white" />
        </motion.button>
      </div>
    </div>
  );
}
