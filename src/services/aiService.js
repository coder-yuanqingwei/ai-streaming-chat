/**
 * AI 服务层 - 处理流式响应和中断
 *
 * 性能优化：
 * 1. 节流（throttle）：批量累积 chunk，最多 30fps 更新一次，防止高频 set() 卡死浏览器
 * 2. 最终 flush：流结束/中断时立即 flush 剩余内容，不丢数据
 */

const API_BASE_URL = '/api';

/**
 * 节流更新工具
 * @param {Function} fn - 回调
 * @param {number} interval - 最小间隔 ms（默认 32ms ≈ 30fps）
 * @returns {Function} throttled + flush
 */
function createThrottle(fn, interval = 32) {
  let lastCall = 0;
  let timer = null;

  const throttled = (content) => {
    const now = performance.now();
    const elapsed = now - lastCall;

    // 超过间隔，立即执行
    if (elapsed >= interval) {
      lastCall = now;
      fn(content);
      return;
    }

    // 否则延迟到间隔结束后执行（保证最后一次也能执行到）
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        lastCall = performance.now();
        fn(content);
      }, interval - elapsed);
    }
  };

  // 立即 flush 剩余内容（用于流结束/中断时）
  throttled.flush = (content) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(content);
  };

  // 取消
  throttled.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return throttled;
}

/**
 * 发送消息并获取流式回复（SSE）
 * @param {string} message - 用户消息
 * @param {string} sessionId - 会话ID
 * @param {AbortController} controller - 用于中断的控制器
 * @param {Function} onChunk - 接收到数据块的回调 (chunk, fullContent)
 * @param {Function} onDone - 完成时的回调
 * @param {Function} onError - 错误回调
 * @param {'mock'|'fast'|'llm'} mode - 模式：mock=模拟, fast=极速, llm=DeepSeek大模型
 * @param {Array} messages - 完整对话历史（仅 llm 模式使用）
 */
export async function streamChatMessage(
  message,
  sessionId,
  controller,
  onChunk,
  onDone,
  onError,
  mode = 'mock',
  messages = []
) {
  // 创建节流器：高频 chunk 批量更新，最多 30fps
  const throttledUpdate = createThrottle((fullContent) => {
    onChunk('', fullContent);
  }, 32);

  try {
    let url, body;

    if (mode === 'llm') {
      // DeepSeek 大模型模式：发送完整对话历史
      url = `${API_BASE_URL}/chat/stream-llm`;
      body = JSON.stringify({ messages, sessionId });
    } else if (mode === 'fast') {
      // 极速模拟模式
      url = `${API_BASE_URL}/chat/stream-fast`;
      body = JSON.stringify({ message, sessionId });
    } else {
      // 普通模拟模式
      url = `${API_BASE_URL}/chat/stream`;
      body = JSON.stringify({ message, sessionId });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // flush 剩余内容，不丢数据
        throttledUpdate.flush(fullContent);
        onDone(fullContent);
        break;
      }

      // 解码数据
      buffer += decoder.decode(value, { stream: true });

      // SSE 数据格式为: data: {...}\n\n
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后不完整的一行

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'chunk') {
              fullContent += data.content;
              // 节流更新：高频时批量，低频时即时
              throttledUpdate(fullContent);
            } else if (data.type === 'error') {
              fullContent += data.content;
              throttledUpdate.flush(fullContent);
              onError(new Error(data.content));
              return;
            } else if (data.type === 'done') {
              throttledUpdate.flush(fullContent);
              onDone(fullContent);
              return;
            }
          } catch (e) {
            // JSON 解析失败，跳过
          }
        }
      }
    }
  } catch (error) {
    // 取消节流定时器，防止 abort 后还触发更新
    throttledUpdate.cancel();

    if (error.name === 'AbortError') {
      console.log('✋ 请求被用户中止');
    } else {
      onError(error);
    }
  }
}

/**
 * 健康检查
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    throw new Error('后端服务不可用');
  }
}
