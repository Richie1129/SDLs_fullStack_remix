// utils/auditUtils.js

// Map backend audit action codes to user-friendly labels
export const formatAuditAction = (action = '') => {
  switch (action) {
    case 'DAILY_PERSONAL_5RS_AI_ANALYSIS':
      return 'AI 分析（5Rs）';
    case 'DAILY_PERSONAL_CREATE':
      return '建立個人日誌';
    case 'DAILY_PERSONAL_UPDATE':
      return '更新個人日誌';
    case 'DAILY_PERSONAL_DELETE':
      return '刪除個人日誌';
    case 'DAILY_TEAM_CREATE':
      return '建立小組日誌';
    case 'DAILY_TEAM_UPDATE':
      return '更新小組日誌';
    case 'DAILY_TEAM_DELETE':
      return '刪除小組日誌';
    case 'DAILY_PERSONAL_ATTACHMENT_REMOVE':
      return '移除個人日誌附件';
    case 'DAILY_TEAM_ATTACHMENT_REMOVE':
      return '移除小組日誌附件';
    default: {
      // Fallback: make the action readable
      if (typeof action === 'string' && action.length > 0) {
        return action
          .toLowerCase()
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
      return '動作';
    }
  }
};

// Given an audit event, produce concise change lines for display
const looksLike5RsJsonPreview = (text) => {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();
  return (
    t.includes('5rs_reflection') ||
    (t.includes('reporting') && t.includes('responding') && t.includes('relating'))
  );
};

export const extractAuditDiffLines = (ev) => {
  const meta = ev?.metadata || {};
  const diff = meta?.diff || {};
  const lines = [];

  if (diff.title) {
    const before = diff.title.before?.textPreview ?? diff.title.before ?? '';
    const after = diff.title.after?.textPreview ?? diff.title.after ?? '';
    lines.push(`標題: ${before || '（空）'} → ${after || '（空）'}`);
  }

  if (diff.content) {
    const beforeRaw = diff.content.before?.textPreview ?? (typeof diff.content.before === 'string' ? diff.content.before : '') ?? '';
    const afterRaw = diff.content.after?.textPreview ?? (typeof diff.content.after === 'string' ? diff.content.after : '') ?? '';
    // For 5Rs JSON previews, avoid dumping JSON; show a clean message instead
    if (looksLike5RsJsonPreview(beforeRaw) || looksLike5RsJsonPreview(afterRaw)) {
      lines.push('5Rs 反思內容: 已更新');
    } else {
      const beforePreview = beforeRaw ? String(beforeRaw).slice(0, 60) : '';
      const afterPreview = afterRaw ? String(afterRaw).slice(0, 60) : '';
      if (beforePreview || afterPreview) lines.push(`內容: ${beforePreview || '（略）'} → ${afterPreview || '（略）'}`);
      else lines.push('內容: 已變更');
    }
  }

  if (diff.file) {
    const b = diff.file.before || {};
    const a = diff.file.after || {};
    const bName = b.name || b.fileName || null;
    const aName = a.name || a.fileName || null;
    if (bName || aName) lines.push(`附件: ${bName || '（無）'} → ${aName || '（無）'}`);
    else lines.push('附件: 已變更');
  }

  if (lines.length === 0 && Array.isArray(meta.changed) && meta.changed.length) {
    lines.push(`欄位: ${meta.changed.join(', ')}`);
  }

  if (lines.length === 0 && ev.action?.includes('CREATE')) {
    lines.push('建立日誌');
  }

  if (lines.length === 0) lines.push('—');

  return lines;
};
