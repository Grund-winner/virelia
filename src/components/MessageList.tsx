'use client';

import { useEffect, useRef } from 'react';
import { useAppStore, type Message } from '@/store';
import { formatDate, formatTimeShort } from '@/lib/helpers';
import { motion } from 'framer-motion';

function getAvatarUrl(avatar: string, name: string) {
  if (avatar) return avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7C5CFC&color=fff&size=128&bold=true`;
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-4">
      <span className="px-4 py-1 rounded-full bg-white/80 backdrop-blur-sm text-xs font-medium text-[#9896BF] shadow-sm border border-[#E5E4F0]">
        {date}
      </span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-end gap-2 mb-3"
    >
      <div className="w-8 h-8 rounded-full bg-[#F4F5FA] flex items-center justify-center flex-shrink-0">
        <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }} />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-[#E5E4F0]">
        <div className="flex items-center gap-1.5">
          <motion.span
            className="w-2 h-2 rounded-full bg-[#7C5CFC]"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-2 h-2 rounded-full bg-[#7C5CFC]"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="w-2 h-2 rounded-full bg-[#7C5CFC]"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function MessageList() {
  const { messages, activeCompanion, isSending } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending]);

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';

  messages.forEach((msg) => {
    const msgDate = formatDate(msg.createdAt);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      const lastGroup = groupedMessages[groupedMessages.length - 1];
      if (lastGroup) {
        lastGroup.messages.push(msg);
      }
    }
  });

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 bg-[#F4F5FA] scrollbar-thin"
      style={{
        backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(124, 92, 252, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(34, 211, 238, 0.03) 0%, transparent 50%)',
      }}
    >
      {messages.length === 0 && !isSending && (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          {activeCompanion && (
            <>
              <img
                src={getAvatarUrl(activeCompanion.avatar, activeCompanion.name)}
                alt={activeCompanion.name}
                className="w-20 h-20 rounded-full object-cover mb-4 shadow-lg"
              />
              <h3 className="text-lg font-semibold text-[#1E1B4B] mb-2">{activeCompanion.name}</h3>
              <p className="text-sm text-[#9896BF] max-w-xs">
                Dites bonjour à {activeCompanion.name} pour commencer la conversation !
              </p>
            </>
          )}
        </div>
      )}

      {groupedMessages.map((group) => (
        <div key={group.date}>
          <DateSeparator date={group.date} />
          {group.messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const prevMsg = index > 0 ? group.messages[index - 1] : null;
            const showAvatar = !prevMsg || prevMsg.sender !== msg.sender;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-end gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Companion avatar */}
                {!isUser && showAvatar && activeCompanion && (
                  <img
                    src={getAvatarUrl(activeCompanion.avatar, activeCompanion.name)}
                    alt={activeCompanion.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                )}
                {!isUser && !showAvatar && <div className="w-8 flex-shrink-0" />}

                {/* Message bubble */}
                <div className={`max-w-[75%] sm:max-w-[65%] ${isUser ? 'order-1' : ''}`}>
                  <div
                    className={`px-4 py-2.5 shadow-sm ${
                      isUser
                        ? 'rounded-2xl rounded-br-md text-white'
                        : 'rounded-2xl rounded-bl-md bg-white border border-[#E5E4F0] text-[#1E1B4B]'
                    }`}
                    style={isUser ? { background: 'linear-gradient(135deg, #7C5CFC, #6B4FE0)' } : {}}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <p className={`text-[10px] text-[#9896BF] mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
                    {formatTimeShort(msg.createdAt)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      ))}

      {/* Typing indicator */}
      {isSending && <TypingIndicator />}

      <div ref={bottomRef} />
    </div>
  );
}
