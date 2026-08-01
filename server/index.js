import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3001;

// DeepSeek API 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// 中间件
app.use(cors());
app.use(express.json());

// 模拟 AI 回复的内容库（支持 Markdown 格式）
const aiResponses = {
  '你好': '你好！我是 AI 助手，很高兴为你服务！有什么我可以帮助你的吗？',

  '介绍一下自己': `## 🤖 自我介绍

我是一个基于大语言模型的 **AI 助手**，具备以下能力：

- 回答问题和提供知识
- 编写和调试代码
- 数据分析和建议
- 实时流式生成回复
- 支持**中止生成**

> 💡 我现在还支持 **Markdown** 渲染，可以输出代码块、表格、列表等富文本内容！`,

  '代码': `当然可以！这里是一个 React Hook 的示例：

\`\`\`jsx
import { useState, useEffect } from 'react';

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
\`\`\`

### 关键点

1. \`useEffect\` 返回清理函数，避免内存泄漏
2. \`setTimeout\` + \`clearTimeout\` 实现防抖
3. 依赖数组 \`[value, delay]\` 确保正确触发

> 更多 React Hooks 用法请参考 [React 官方文档](https://react.dev)`,

  '表格': `当然！下面是一个功能对比表：

| 特性 | 普通模式 | 极速模式 | 说明 |
|------|:--------:|:--------:|------|
| 传输速度 | 50-100ms/字 | 0ms | 极速模式瞬间发送 |
| 节流 | 不需要 | ✅ 30fps | 防止高频渲染卡顿 |
| React.memo | ✅ | ✅ | 防止历史消息重渲染 |
| 数据完整性 | ✅ | ✅ | flush 保证不丢数据 |
| 中止生成 | ✅ | ✅ | AbortController |

### 性能指标

\`\`\`bash
# 普通模式：800 字符约需 60 秒
time curl -X POST /api/chat/stream -d '{"message":"你好"}'

# 极速模式：800 字符约需 0.1 秒
time curl -X POST /api/chat/stream-fast -d '{"message":"你好"}'
\`\`\``,

  '默认': `这是一个很好的问题！让我来详细回答一下。

## 核心思路

首先，我们需要理解问题的**核心概念**。然后从多个角度分析：

1. **技术层面** - 架构设计、性能优化
2. **业务层面** - 需求拆解、优先级
3. **用户体验** - 交互流畅度、反馈及时性

### 示例代码

\`\`\`javascript
// 流式数据处理示例
async function processStream(reader) {
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  return result;
}
\`\`\`

### 总结

| 方面 | 建议 |
|------|------|
| 性能 | 使用节流批量更新 |
| 体验 | 支持中止和流式 |
| 可靠性 | flush 保证数据完整 |

希望这个回答对你有帮助！`
};

// 生成一段长文本（用于极速模式压测）
function generateLongContent() {
  const parts = [];
  for (let i = 0; i < 50; i++) {
    parts.push(`第${i + 1}段：这是一段用于性能测试的文本内容。`);
  }
  return parts.join('');
}

// ========== 普通 SSE 端点（每个字符间隔 50-100ms）==========
app.post('/api/chat/stream', async (req, res) => {
  const { message, sessionId } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  let content = aiResponses[message] || aiResponses['默认'];

  await new Promise(resolve => setTimeout(resolve, 500));

  const characters = content.split('');
  for (let i = 0; i < characters.length; i++) {
    const data = { type: 'chunk', content: characters[i], index: i };
    res.write(`data: ${JSON.stringify(data)}\n\n`);

    // 慢速：50-100ms / 字符
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));

    if (req.aborted) break;
  }

  res.write(`data: ${JSON.stringify({ type: 'done', content: '' })}\n\n`);
  res.end();

  console.log(`[普通] 会话 ${sessionId} 的消息 "${message}" 处理完成`);
});

// ========== 极速 SSE 端点（0ms 间隔，瞬间发送大量数据）==========
app.post('/api/chat/stream-fast', async (req, res) => {
  const { message, sessionId } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 极速模式：生成大量文本，0ms 间隔发送
  const content = (aiResponses[message] || aiResponses['默认']).repeat(5) + generateLongContent();
  const characters = content.split('');

  console.log(`[极速] 会话 ${sessionId} 开始发送 ${characters.length} 个字符（0ms 间隔）`);

  // 不做任何延迟，瞬间逐字发送全部内容
  for (let i = 0; i < characters.length; i++) {
    const data = { type: 'chunk', content: characters[i], index: i };
    res.write(`data: ${JSON.stringify(data)}\n\n`);

    // 每 100 个字符 yield 一次，让 Node.js 事件循环有机会处理
    if (i % 100 === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }

    if (req.aborted) break;
  }

  res.write(`data: ${JSON.stringify({ type: 'done', content: '' })}\n\n`);
  res.end();

  console.log(`[极速] 会话 ${sessionId} 完成，共发送 ${characters.length} 个字符`);
});

// ========== DeepSeek 真实大模型端点 ==========
app.post('/api/chat/stream-llm', async (req, res) => {
  const { messages, sessionId } = req.body;

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 检查 API Key
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your_api_key_here') {
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        content: '❌ 未配置 DeepSeek API Key，请在 .env 文件中设置 DEEPSEEK_API_KEY',
      })}\n\n`
    );
    res.write(`data: ${JSON.stringify({ type: 'done', content: '' })}\n\n`);
    res.end();
    return;
  }

  try {
    console.log(`[DeepSeek] 会话 ${sessionId} 开始调用，消息数: ${messages?.length || 0}`);

    // 调用 DeepSeek API（OpenAI 兼容格式）
    const llmResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        stream: true,
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error(`[DeepSeek] API 错误 ${llmResponse.status}:`, errText);
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          content: `❌ DeepSeek API 错误 (${llmResponse.status}): ${errText}`,
        })}\n\n`
      );
      res.write(`data: ${JSON.stringify({ type: 'done', content: '' })}\n\n`);
      res.end();
      return;
    }

    // 读取 DeepSeek 的 SSE 流并转发给前端
    const reader = llmResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') {
          res.write(`data: ${JSON.stringify({ type: 'done', content: '' })}\n\n`);
          res.end();
          console.log(`[DeepSeek] 会话 ${sessionId} 完成`);
          return;
        }

        try {
          const data = JSON.parse(jsonStr);
          const content = data.choices?.[0]?.delta?.content || '';

          if (content) {
            res.write(
              `data: ${JSON.stringify({ type: 'chunk', content })}\n\n`
            );
          }
        } catch (e) {
          // JSON 解析失败，跳过
        }
      }
    }

    // 如果流自然结束但没有收到 [DONE]
    res.write(`data: ${JSON.stringify({ type: 'done', content: '' })}\n\n`);
    res.end();
    console.log(`[DeepSeek] 会话 ${sessionId} 完成`);
  } catch (error) {
    console.error('[DeepSeek] 调用失败:', error);
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        content: `❌ 调用 DeepSeek 失败: ${error.message}`,
      })}\n\n`
    );
    res.write(`data: ${JSON.stringify({ type: 'done', content: '' })}\n\n`);
    res.end();
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    deepseek: DEEPSEEK_API_KEY && DEEPSEEK_API_KEY !== 'your_api_key_here',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`);
  console.log(`📡 模拟 SSE: http://localhost:${PORT}/api/chat/stream`);
  console.log(`⚡ 极速 SSE: http://localhost:${PORT}/api/chat/stream-fast`);
  console.log(`🤖 DeepSeek: http://localhost:${PORT}/api/chat/stream-llm`);
  if (DEEPSEEK_API_KEY && DEEPSEEK_API_KEY !== 'your_api_key_here') {
    console.log(`✅ DeepSeek API Key 已配置 (模型: ${DEEPSEEK_MODEL})`);
  } else {
    console.log(`⚠️  DeepSeek API Key 未配置，请在 .env 中设置 DEEPSEEK_API_KEY`);
  }
});
