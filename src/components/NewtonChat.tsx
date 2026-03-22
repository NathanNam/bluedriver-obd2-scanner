import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../hooks/useNewtonChat';
import { useThemeColors } from '../utils/hooks';
import { captureLiveCharts } from '../lib/captureScreen';

interface Props {
  available: boolean;
  loading: boolean;
  messages: ChatMessage[];
  askNewton: (question: string, chartImage: string | null) => void;
  hasData: boolean;
}

const SUGGESTED_QUESTIONS = [
  'Is my car healthy?',
  'Explain the sensor readings',
  'Any concerns?',
  'What do the DTCs mean?',
];

export function NewtonChat({ available, loading, messages, askNewton, hasData }: Props) {
  const theme = useThemeColors();
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!available) return null;

  const handleSend = async (question?: string) => {
    const q = question ?? input.trim();
    if (!q || loading) return;
    setInput('');

    const chartImage = await captureLiveCharts();
    askNewton(q, chartImage);
  };

  // Markdown renderer: headings, bold, italic, inline code, lists
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Apply inline formatting
      let processed = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:#E5E5EA;padding:1px 4px;border-radius:3px;font-size:12px">$1</code>');

      // Headings
      const h3Match = line.match(/^###\s+(.*)/);
      if (h3Match) {
        const content = h3Match[1].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <div key={i} style={{ fontSize: 14, fontWeight: 700, marginTop: 12, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: content }} />;
      }
      const h2Match = line.match(/^##\s+(.*)/);
      if (h2Match) {
        const content = h2Match[1].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <div key={i} style={{ fontSize: 15, fontWeight: 700, marginTop: 14, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: content }} />;
      }
      const h1Match = line.match(/^#\s+(.*)/);
      if (h1Match) {
        const content = h1Match[1].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <div key={i} style={{ fontSize: 17, fontWeight: 700, marginTop: 16, marginBottom: 6 }} dangerouslySetInnerHTML={{ __html: content }} />;
      }

      // Numbered lists
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        const content = numMatch[2]
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
            <span style={{ color: '#8E8E93', fontWeight: 600, flexShrink: 0 }}>{numMatch[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        );
      }

      // Bullet lists
      const bulletMatch = line.match(/^[-*•]\s+(.*)/);
      if (bulletMatch) {
        const content = bulletMatch[1]
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 4 }}>
            <span style={{ color: '#8E8E93', flexShrink: 0 }}>{'\u2022'}</span>
            <span dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        );
      }

      // Empty line
      if (!line.trim()) return <div key={i} style={{ height: 8 }} />;

      // Regular paragraph
      return <div key={i} style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  return (
    <div style={{
      backgroundColor: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #007AFF, #0055CC)',
          color: '#FFF', cursor: 'pointer',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Newton AI</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Ask about your vehicle data</div>
        </div>
        <span style={{ fontSize: 14 }}>{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <div style={{ padding: 16 }}>
          {/* Data warning */}
          {!hasData && (
            <div style={{
              padding: '10px 12px', backgroundColor: theme.warning + '15',
              borderRadius: 8, marginBottom: 12, fontSize: 12, color: theme.text,
            }}>
              Start a Live Scan first so Newton can see your vehicle data.
            </div>
          )}

          {/* Messages */}
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
            {messages.length === 0 && (
              <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 12 }}>
                What would you like to know about your vehicle?
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 8,
                }}
              >
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: 12,
                  backgroundColor: msg.role === 'user' ? theme.primary : theme.surfaceSecondary,
                  color: msg.role === 'user' ? '#FFF' : theme.text,
                  fontSize: 13, lineHeight: '20px',
                }}>
                  {msg.role === 'newton' ? renderMarkdown(msg.text) : msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                <div style={{
                  padding: '8px 12px', borderRadius: 12,
                  backgroundColor: theme.surfaceSecondary, fontSize: 13, color: theme.textSecondary,
                }}>
                  Analyzing your dashboard...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions */}
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  style={{
                    padding: '6px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500,
                    backgroundColor: theme.primary + '10', color: theme.primary,
                    border: `1px solid ${theme.primary}30`,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your car..."
              disabled={loading}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                border: `1px solid ${theme.border}`, backgroundColor: theme.background,
                color: theme.text, outline: 'none',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                backgroundColor: theme.primary, color: '#FFF',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
