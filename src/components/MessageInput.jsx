import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

export default function MessageInput() {
  const [input, setInput] = useState('');
  const [fastMode, setFastMode] = useState(false);
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
    sendMessage(input, fastMode);
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

          {/* 极速模式开关 */}
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
            <span className={fastMode ? 'text-orange-500 font-medium' : 'text-gray-400'}>
              极速模式
            </span>
            <button
              type="button"
              onClick={() => setFastMode(!fastMode)}
              disabled={isGenerating}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                fastMode ? 'bg-orange-500' : 'bg-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  fastMode ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </form>
    </div>
  );
}
