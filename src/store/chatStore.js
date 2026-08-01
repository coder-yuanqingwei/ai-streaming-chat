import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { streamChatMessage } from '../services/aiService';

const useChatStore = create(
  persist(
    (set, get) => ({
      // ========== 状态 ==========
      sessions: [],
      activeSessionId: null,

      // ========== 初始化 ==========
      // 确保至少有一个会话（在 App 中调用）
      initStore: () => {
        const { sessions, createSession } = get();
        if (sessions.length === 0) {
          createSession();
        }
      },

      // ========== 会话操作 ==========
      createSession: () => {
        const newSession = {
          id: uuidv4(),
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
          isGenerating: false,
          controller: null,
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: newSession.id,
        }));
        return newSession.id;
      },

      switchSession: (sessionId) => set({ activeSessionId: sessionId }),

      renameSession: (sessionId, title) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, title } : s
          ),
        })),

      deleteSession: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          activeSessionId:
            state.activeSessionId === sessionId
              ? state.sessions.find((s) => s.id !== sessionId)?.id || null
              : state.activeSessionId,
        })),

      // ========== 消息操作 ==========
      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, messages: [...session.messages, message] }
              : session
          ),
        })),

      updateStreamingMessage: (sessionId, content) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((msg, index) =>
                    index === session.messages.length - 1 && msg.isStreaming
                      ? { ...msg, content }
                      : msg
                  ),
                }
              : session
          ),
        })),

      finalizeStreamingMessage: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((msg) =>
                    msg.isStreaming ? { ...msg, isStreaming: false } : msg
                  ),
                  isGenerating: false,
                  controller: null,
                }
              : session
          ),
        })),

      // ========== 生成控制 ==========
      setGenerating: (sessionId, isGenerating, controller = null) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, isGenerating, controller }
              : session
          ),
        })),

      abortGeneration: (sessionId) => {
        const { sessions } = get();
        const session = sessions.find((s) => s.id === sessionId);

        if (session?.controller) {
          session.controller.abort();
          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === sessionId
                ? { ...s, isGenerating: false, controller: null }
                : s
            ),
          }));

          // 移除最后一条未完成的 AI 消息
          const lastMessage = session.messages[session.messages.length - 1];
          if (lastMessage?.isStreaming) {
            set((state) => ({
              sessions: state.sessions.map((s) =>
                s.id === sessionId
                  ? { ...s, messages: s.messages.slice(0, -1) }
                  : s
              ),
            }));
          }
        }
      },

      // ========== 清空所有会话 ==========
      clearAllSessions: () => {
        const { createSession } = get();
        set({ sessions: [], activeSessionId: null });
        createSession();
      },

      // ========== 发送消息（核心流程） ==========
      sendMessage: async (content, mode = 'mock') => {
        const {
          sessions,
          activeSessionId,
          createSession,
          addMessage,
          updateStreamingMessage,
          setGenerating,
          finalizeStreamingMessage,
        } = get();

        // 如果没有活跃会话，创建一个
        let sessionId = activeSessionId;
        if (!sessionId) sessionId = createSession();

        const session = sessions.find((s) => s.id === sessionId);

        // 如果正在生成，不允许发送新消息
        if (session?.isGenerating) return;

        // 构建发送给大模型的消息历史（仅 llm 模式需要）
        const llmMessages =
          mode === 'llm' && session
            ? [
                ...session.messages.map((msg) => ({
                  role: msg.role,
                  content: msg.content,
                })),
                { role: 'user', content },
              ]
            : [];

        // 1. 添加用户消息
        addMessage(sessionId, {
          id: uuidv4(),
          role: 'user',
          content,
          timestamp: Date.now(),
        });

        // 如果是第一条消息，用消息内容作为会话标题
        if (session && session.messages.length === 0) {
          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    title: content.slice(0, 20) + (content.length > 20 ? '...' : ''),
                  }
                : s
            ),
          }));
        }

        // 2. 创建 AbortController 用于中断
        const controller = new AbortController();
        setGenerating(sessionId, true, controller);

        // 3. 添加空白的 AI 消息（等待流式填充）
        addMessage(sessionId, {
          id: uuidv4(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        });

        // 4. 开始流式接收
        try {
          await streamChatMessage(
            content,
            sessionId,
            controller,
            (chunk, fullContent) => {
              updateStreamingMessage(sessionId, fullContent);
            },
            () => {
              finalizeStreamingMessage(sessionId);
            },
            (error) => {
              console.error('生成出错:', error);
              updateStreamingMessage(sessionId, error.message || '❌ 生成失败，请重试');
              setTimeout(() => finalizeStreamingMessage(sessionId), 2000);
            },
            mode,
            llmMessages
          );
        } catch (error) {
          console.error('流式请求失败:', error);
          updateStreamingMessage(sessionId, '❌ 网络错误，请检查后端服务');
          finalizeStreamingMessage(sessionId);
        }
      },
    }),
    {
      name: 'ai-chat-storage', // localStorage key
      // 只持久化需要的数据，排除 controller 等不可序列化的字段
      partialize: (state) => ({
        sessions: state.sessions.map((s) => ({
          ...s,
          isGenerating: false, // 重置生成状态
          controller: null, // AbortController 不可序列化
        })),
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);

export { useChatStore };
