import { ACTION_META, CAT_COLOR, getActionMeta } from './actionMeta';

export const normalizeEvents = (rawEvents, nodes) => {
  const nodeById = new Map(nodes.map(n => [String(n.id), n]));
  return rawEvents.map(e => {
    const targetIdStr = e.targetId != null ? String(e.targetId) : null;
    const matchedNode = e.targetType === 'node' && targetIdStr ? nodeById.get(targetIdStr) : null;
    // 先把 timestamp 算成 epoch ms，避免下游每次比較都 new Date()
    const tsMs = e.timestamp ? new Date(e.timestamp).getTime() : 0;
    return {
      ...e,
      tsMs,
      conceptId: matchedNode ? `n${matchedNode.id}` : null,
      conceptLabel: matchedNode ? matchedNode.title : null,
    };
  });
};

const targetKeyOf = (e) => `${e.targetType}:${e.targetId ?? 'na'}`;

const targetLabelOf = (e) => {
  if (e.conceptLabel) return e.conceptLabel;
  if (e.targetType === 'node') return `節點 ${e.targetId ?? ''}`.trim();
  if (e.targetType === 'project') return `專案 ${e.targetId ?? ''}`.trim();
  if (e.targetType === 'submit') return `提交 ${e.targetId ?? ''}`.trim();
  if (e.targetType === 'file') return `檔案 ${e.targetId ?? ''}`.trim();
  if (e.targetType === 'idea_wall_message') return `想法牆留言`;
  if (e.targetType === 'chatroom_message') return `聊天訊息`;
  if (e.targetType === 'kanban') return `看板 ${e.targetId ?? ''}`.trim();
  if (e.targetType === 'task') return `任務 ${e.targetId ?? ''}`.trim();
  if (e.targetType === 'assistant_session') return `AI 會話`;
  if (e.targetType) return `${e.targetType} ${e.targetId ?? ''}`.trim();
  return '未分類';
};

// 共用彙總：Radial 與 Sankey 都消費這個結果
export const buildEventAggregates = (events) => {
  const byActor = new Map();
  const byCategory = new Map();
  const byTargetType = new Map();
  const byTarget = new Map();       // targetKey → { label, count, cat, targetType }
  const actorToCat = new Map();     // "actor|cat" → count
  const catToTargetType = new Map();// "cat|tt" → count
  const catToTarget = new Map();    // "cat|targetKey" → count
  const actorToTargetType = new Map(); // "actor|tt" → count

  for (const e of events) {
    if (!e.actorName || !e.targetType) continue;
    const cat = getActionMeta(e.action).cat;
    const tKey = targetKeyOf(e);
    const actor = e.actorName;

    byActor.set(actor, (byActor.get(actor) || 0) + 1);
    byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
    byTargetType.set(e.targetType, (byTargetType.get(e.targetType) || 0) + 1);

    if (!byTarget.has(tKey)) {
      byTarget.set(tKey, { label: targetLabelOf(e), count: 0, cat, targetType: e.targetType });
    }
    const t = byTarget.get(tKey);
    t.count += 1;

    const ac = `${actor}|${cat}`;
    actorToCat.set(ac, (actorToCat.get(ac) || 0) + 1);

    const ctt = `${cat}|${e.targetType}`;
    catToTargetType.set(ctt, (catToTargetType.get(ctt) || 0) + 1);

    const ct = `${cat}|${tKey}`;
    catToTarget.set(ct, (catToTarget.get(ct) || 0) + 1);

    const att = `${actor}|${e.targetType}`;
    actorToTargetType.set(att, (actorToTargetType.get(att) || 0) + 1);
  }

  return { byActor, byCategory, byTargetType, byTarget, actorToCat, catToTargetType, catToTarget, actorToTargetType };
};

// 時序流：同一 actor 在指定視窗內「做完 X 後接著做 Y」的轉換次數
// window: 'day' | number(minutes)
// 注意：events 應已在 caller 處按 actor / 類別 / 時間過濾好；本函式不再做 actor filter。
export const buildTemporalFlow = (events, { window = 30 } = {}) => {
  const byActor = new Map();
  for (const e of events) {
    if (!e.actorName) continue;
    if (!byActor.has(e.actorName)) byActor.set(e.actorName, []);
    byActor.get(e.actorName).push(e);
  }
  byActor.forEach(arr => arr.sort((a, b) => (a.tsMs || 0) - (b.tsMs || 0)));

  const transitions = new Map(); // "from|to" → count
  const catFromTotal = new Map();
  const catToTotal = new Map();

  const sameDay = (tsA, tsB) => {
    const da = new Date(tsA), db = new Date(tsB);
    return da.getFullYear() === db.getFullYear()
        && da.getMonth() === db.getMonth()
        && da.getDate() === db.getDate();
  };

  const windowMs = typeof window === 'number' ? window * 60 * 1000 : null;
  const inWindow = (tsFrom, tsTo) => {
    if (window === 'day') return sameDay(tsFrom, tsTo);
    const diff = tsTo - tsFrom;
    return diff <= windowMs && diff >= 0;
  };

  byActor.forEach(arr => {
    for (let i = 0; i < arr.length - 1; i++) {
      const fromEv = arr[i];
      const nextEv = arr[i + 1];
      if (!inWindow(fromEv.tsMs, nextEv.tsMs)) continue;
      const fromCat = getActionMeta(fromEv.action).cat;
      const toCat = getActionMeta(nextEv.action).cat;
      const key = `${fromCat}|${toCat}`;
      transitions.set(key, (transitions.get(key) || 0) + 1);
      catFromTotal.set(fromCat, (catFromTotal.get(fromCat) || 0) + 1);
      catToTotal.set(toCat, (catToTotal.get(toCat) || 0) + 1);
    }
  });

  return { transitions, catFromTotal, catToTotal };
};

export const summarizeByCategory = (events) => {
  const byCat = new Map();
  for (const e of events) {
    const cat = getActionMeta(e.action).cat;
    byCat.set(cat, (byCat.get(cat) || 0) + 1);
  }
  return [...byCat.entries()]
    .map(([cat, count]) => ({ cat, count, color: CAT_COLOR[cat] || CAT_COLOR['其他'] }))
    .sort((a, b) => b.count - a.count);
};

export const summarizeByTargetType = (events) => {
  const byType = new Map();
  for (const e of events) {
    if (!e.targetType) continue;
    byType.set(e.targetType, (byType.get(e.targetType) || 0) + 1);
  }
  return [...byType.entries()]
    .map(([targetType, count]) => ({ targetType, count }))
    .sort((a, b) => b.count - a.count);
};

export const filterByTimeRange = (events, range) => {
  if (range === 'all') return events;
  const days = range === 'week' ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return events.filter(e => (e.tsMs ?? 0) >= cutoff);
};

export { ACTION_META, CAT_COLOR };
