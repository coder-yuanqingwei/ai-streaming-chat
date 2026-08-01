import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

export default function SessionManager({ onClearAll }) {
  const {
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
  } = useChatStore();

  return (
    <div className="w-64 bg-gray-900 text-gray-100 flex flex-col flex-shrink-0">
      {/* 头部：新建对话 */}
      <div className="p-3 border-b border-gray-800">
        <button
          onClick={createSession}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建对话
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">暂无会话</div>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={() => switchSession(session.id)}
              onDelete={() => deleteSession(session.id)}
              onRename={(title) => renameSession(session.id, title)}
            />
          ))
        )}
      </div>

      {/* 底部信息 */}
      <div className="p-3 border-t border-gray-800 text-xs text-gray-500 space-y-2">
        <div className="flex items-center justify-between">
          <span>共 {sessions.length} 个会话</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            已持久化
          </span>
        </div>
        {sessions.length > 0 && (
          <button
            onClick={onClearAll}
            className="w-full text-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 py-1.5 rounded transition-all"
          >
            清空所有会话
          </button>
        )}
      </div>
    </div>
  );
}

function SessionItem({ session, isActive, onSelect, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const inputRef = useRef(null);

  // 进入编辑模式时自动 focus + 选中
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // 同步外部 title 变化
  useEffect(() => {
    if (!editing) setEditValue(session.title);
  }, [session.title, editing]);

  const startEditing = (e) => {
    e.stopPropagation();
    setEditValue(session.title);
    setEditing(true);
  };

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  const cancelRename = () => {
    setEditValue(session.title);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  };

  return (
    <div
      onClick={onSelect}
      onDoubleClick={startEditing}
      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
        isActive ? 'bg-gray-800 text-white' : 'hover:bg-gray-800/50 text-gray-300'
      }`}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-700 text-white text-sm font-medium px-2 py-1 rounded border border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="输入会话名称"
          />
        ) : (
          <>
            <div className="text-sm font-medium truncate flex items-center gap-1.5">
              {isActive && (
                <span className="w-1 h-4 bg-blue-500 rounded-full flex-shrink-0"></span>
              )}
              {session.title}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {session.messages.length} 条消息
              {session.isGenerating && (
                <span className="ml-2 text-green-400 flex items-center gap-1 inline-flex">
                  <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></span>
                  生成中
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* 操作按钮 */}
      {!editing && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* 重命名按钮 */}
          <button
            onClick={startEditing}
            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-500/20 hover:text-blue-400 rounded transition-all"
            title="重命名（双击也可）"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {/* 删除按钮 */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
            title="删除会话"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
