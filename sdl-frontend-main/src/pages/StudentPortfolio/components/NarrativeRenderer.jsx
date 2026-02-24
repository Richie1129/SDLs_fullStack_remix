/**
 * AI 學習敘事 Markdown 渲染器
 * 供三個 PDF 模板共用，支援客製化字型顏色
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function NarrativeRenderer({ narrative, accentColor = '#1e3a5f', baseFontSize = '9.5pt' }) {
  if (!narrative) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 style={{ fontSize: '13pt', fontWeight: '700', color: accentColor, margin: '5mm 0 2mm', borderBottom: `1px solid ${accentColor}40`, paddingBottom: '1mm' }}>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 style={{ fontSize: '12pt', fontWeight: '700', color: accentColor, margin: '4mm 0 2mm' }}>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 style={{ fontSize: '11pt', fontWeight: '700', color: accentColor, margin: '4mm 0 1.5mm' }}>
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p style={{ fontSize: baseFontSize, lineHeight: '1.9', margin: '0 0 3mm', color: '#333' }}>
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong style={{ color: accentColor, fontWeight: '700' }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em style={{ color: '#555', fontStyle: 'italic' }}>{children}</em>
        ),
        blockquote: ({ children }) => (
          <blockquote style={{
            borderLeft: `3px solid ${accentColor}`,
            paddingLeft: '4mm',
            margin: '2mm 0',
            color: '#555',
            fontStyle: 'italic',
            fontSize: baseFontSize
          }}>
            {children}
          </blockquote>
        ),
        hr: () => (
          <hr style={{ border: 'none', borderTop: `1px solid ${accentColor}30`, margin: '3mm 0' }} />
        ),
        ul: ({ children }) => (
          <ul style={{ paddingLeft: '5mm', margin: '1mm 0 3mm', fontSize: baseFontSize, color: '#333' }}>
            {children}
          </ul>
        ),
        li: ({ children }) => (
          <li style={{ marginBottom: '1mm', lineHeight: '1.8' }}>{children}</li>
        )
      }}
    >
      {narrative}
    </ReactMarkdown>
  );
}
