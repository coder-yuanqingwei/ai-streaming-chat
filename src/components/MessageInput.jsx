import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

// 模式配置
const MODES = [
  { value: 'mock', label: '模拟', color: 'gray', icon: '💬' },
  { value: 'fast', label: '极速', color: 'orange', icon: '⚡' },
  { value: 'llm', label: 'DeepSeek', color: 'blue', icon: '🤖' },
];

export default function MessageInput() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('mock');
  const textareaRef = useRef(null);
  const { sessions, activeSessionId, sendMessage, abortGeneration } =
    useChatStore();

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const isGenerating = activeSession?.isGenerating;

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        150
      )}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    sendMessage(input, mode);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleAbort = () => {
    if (activeSessionId) {
      abortGeneration(activeSessionId);
    }
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        {/* 模式选择器 */}
        <div className="flex items-center gap-1 mb-2.5">
          <span className="text-xs text-gray-400 mr-1">模式</span>
          <div className="inline-flex items-center rounded-lg bg-gray-100 p-0.5">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                disabled={isGenerating}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1
                  ${
                    mode === m.value
                      ? m.value === 'llm'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : m.value === 'fast'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-white text-gray-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <span>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
          {mode === 'llm' && (
            <span className="text-xs text-blue-400 ml-1">需配置 API Key</span>
          )}
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isGenerating ? 'AI 正在生成回复...' : '输入消息，按 Enter 发送'
              }
              disabled={isGenerating}
              rows={1}
              className="w-full min-h-[48px] max-h-[150px] px-4 py-3 pr-4 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition-all"
            />
          </div>

          {/* 发送 / 停止按钮 */}
          {isGenerating ? (
            <button
              type="button"
              onClick={handleAbort}
              className="px-5 py-3 rounded-2xl font-medium bg-red-500 hover:bg-red-600 text-white transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <rect x="4" y="4" width="12" height="12" rx="2" />
              </svg>
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-5 py-3 rounded-2xl font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l-7-7 7-7M5 12h14" />
              </svg>
              发送
            </button>
          )}
        </div>

        {/* 底部提示行 */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-gray-400">
            {isGenerating ? (
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                正在流式生成，点击「停止」可随时中断
              </span>
            ) : (
              <span>
                按 <kbd className="px-1 bg-gray-100 rounded text-gray-500">Enter</kbd> 发送 ·{' '}
                按 <kbd className="px-1 bg-gray-100 rounded text-gray-500">Shift+Enter</kbd> 换行
              </span>
            )}
          </p>
        </div>
      </form>
    </div>
  );
}
