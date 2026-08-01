import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

/**
 * 递归从 React children 中提取纯文本
 * rehype-highlight 会把代码解析成 <span> 元素，需要递归提取文字
 */
function extractText(children) {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (React.isValidElement(children)) return extractText(children.props.children);
  return '';
}

/**
 * 代码块组件：带语言标签 + 复制按钮
 */
function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') || 'text';

  const handleCopy = useCallback(() => {
    const text = extractText(children);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="relative group/code my-3">
      {/* 语言标签 + 复制按钮 */}
      <div className="flex items-center justify-between bg-gray-700 text-gray-300 text-xs px-4 py-1.5 rounded-t-lg">
        <span className="font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1"
        >
          {copied ? '✓ 已复制' : '📋 复制'}
        </button>
      </div>
      {/* 代码内容 */}
      <pre className="!mt-0 !rounded-t-none overflow-x-auto">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

/**
 * Markdown 渲染器
 * 支持：代码块（语法高亮）、表格、列表、引用、链接、删除线等 GFM 语法
 */
export default function MarkdownRenderer({ content }) {
  return (
    <div className="markdown-body text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 代码块（```language）
          pre: ({ children }) => <>{children}</>,
          code: ({ inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code
                  className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-[13px] font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className} {...props}>{children}</CodeBlock>;
          },
          // 表格
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse border border-gray-300 text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-3 py-1.5">{children}</td>
          ),
          // 引用
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-3 py-1 my-2 text-gray-600 italic">
              {children}
            </blockquote>
          ),
          // 链接
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              {children}
            </a>
          ),
          // 列表
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
          ),
          // 段落
          p: ({ children }) => <p className="my-2">{children}</p>,
          // 标题
          h1: ({ children }) => <h1 className="text-lg font-bold my-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold my-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold my-2">{children}</h3>,
          // 分割线
          hr: () => <hr className="border-gray-200 my-3" />,
          // 图片
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="max-w-full rounded-lg my-2" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
