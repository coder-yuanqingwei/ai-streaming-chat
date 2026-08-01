import React, { useEffect, useRef } from 'react';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import SessionManager from './components/SessionManager';
import { useChatStore } from './store/chatStore';

export default function App() {
  const { initStore, clearAllSessions } = useChatStore();
  const initialized = useRef(false);

  // 初始化：用 ref 防止 StrictMode 重复调用
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initStore();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* 左侧：会话管理 */}
      <SessionManager onClearAll={clearAllSessions} />

      {/* 右侧：聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 聊天头部 */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>🤖</span>
              <span>AI 智能助手</span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              流式输出 · 会话管理 · 中止生成 · 本地持久化
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              已连接
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
              Zustand
            </span>
            <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full">
              SSE
            </span>
            <span className="px-2 py-1 bg-amber-100 text-amber-600 rounded-full">
              持久化
            </span>
          </div>
        </header>

        {/* 消息列表 */}
        <MessageList />

        {/* 输入框 */}
        <MessageInput />
      </div>
    </div>
  );
}
