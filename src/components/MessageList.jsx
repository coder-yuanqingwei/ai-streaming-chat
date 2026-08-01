import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import MarkdownRenderer from './MarkdownRenderer';

export default function MessageList() {
  const { sessions, activeSessionId } = useChatStore();
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const scrollRef = useRef(null);
  const autoScrollRafRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // 强制滚动到底部：立即执行，不走 rAF，不受流式节流影响
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setShowScrollBtn(false);
  }, []);

  // 被动滚动：只在用户已在底部附近时自动跟滚（流式更新用）
  const autoScrollIfNearBottom = useCallback(() => {
    if (autoScrollRafRef.current) return;
    autoScrollRafRef.current = requestAnimationFrame(() => {
      autoScrollRafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;

      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 150;

      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
        setShowScrollBtn(false);
      }
    });
  }, []);

  // 消息变化时的滚动策略：
  // - 新增消息且包含用户消息 → 用户刚发送，强制滚到底
  // - 流式更新（数量不变） → 仅在底部附近时自动跟滚
  useEffect(() => {
    const messages = activeSession?.messages;
    if (!messages || messages.length === 0) {
      prevMsgCountRef.current = 0;
      return;
    }

    const prevCount = prevMsgCountRef.current;
    const newCount = messages.length;
    prevMsgCountRef.current = newCount;

    // 消息数量增加：检查新增的消息中是否包含用户消息
    if (newCount > prevCount) {
      const newMessages = messages.slice(prevCount);
      const hasUserMessage = newMessages.some((m) => m.role === 'user');

      if (hasUserMessage) {
        scrollToBottom();
        setShowScrollBtn(false);
        return;
      }
    }

    // 流式更新或 AI 新增消息，仅在底部时跟滚
    autoScrollIfNearBottom();
  }, [activeSession?.messages, scrollToBottom, autoScrollIfNearBottom]);

  // 清理 rAF
  useEffect(() => {
    return () => {
      if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current);
    };
  }, []);

  // 滚动监听：检测是否需要显示「回到最新」按钮
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150;

    setShowScrollBtn(!isNearBottom);
  }, []);

  // 点击按钮：平滑滚到底部
  const handleScrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth',
    });
    setShowScrollBtn(false);
  }, []);

  if (!activeSession) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-lg">创建一个新会话开始对话</p>
        </div>
      </div>
    );
  }

  if (activeSession.messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <p className="text-lg">输入消息开始与 AI 对话</p>
          <p className="text-sm mt-2 text-gray-400">
            支持 <span className="text-blue-500">流式输出</span> ·{' '}
            <span className="text-green-500">随时中止</span> ·{' '}
            <span className="text-purple-500">Markdown 渲染</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden">
      {/* 消息滚动区域 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {activeSession.messages.map((message, index) => (
            <MessageBubble
              key={message.id || index}
              message={message}
              isLastMessage={index === activeSession.messages.length - 1}
            />
          ))}
        </div>
      </div>

      {/* 悬浮按钮：回到最新对话 */}
      {showScrollBtn && (
        <button
          onClick={handleScrollToBottom}
          className="absolute bottom-4 right-6 z-10 flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-full shadow-lg transition-all hover:scale-105"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          回到最新
        </button>
      )}
    </div>
  );
}

/**
 * React.memo 优化：已完成的消息内容不变 → 不重渲染
 */
const MessageBubble = React.memo(function MessageBubble({ message, isLastMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* AI 头像 */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm mr-2 mt-1 flex-shrink-0">
          🤖
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
        }`}
      >
        {/* 消息内容：AI 用 Markdown 渲染，用户用纯文本 */}
        {isUser ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
        ) : (
          <div className="text-sm leading-relaxed break-words">
            <MarkdownRenderer content={message.content} />
            {isLastMessage && message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
            )}
          </div>
        )}

        {/* 时间戳 */}
        <div
          className={`text-[10px] mt-1 ${
            isUser ? 'text-blue-200' : 'text-gray-400'
          }`}
        >
          {new Date(message.timestamp).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })}
        </div>
      </div>

      {/* 用户头像 */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white text-sm ml-2 mt-1 flex-shrink-0">
          👤
        </div>
      )}
    </div>
  );
});
