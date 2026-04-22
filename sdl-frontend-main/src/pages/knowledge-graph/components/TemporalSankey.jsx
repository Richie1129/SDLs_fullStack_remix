import React, { useMemo, useState } from 'react';
import { CAT_COLOR } from '../utils/actionMeta';
import { buildTemporalFlow } from '../utils/buildGraph';

const W = 960;
const H = 560;
const PAD_X = 32;
const PAD_Y = 32;
const COL_W = 160;
const GAP = 8;

const colorForCat = (cat) => CAT_COLOR[cat] || CAT_COLOR['其他'];

const trimLabel = (s, n = 12) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s || '');

// 輸入 events 應已經過 caller 的 actor 過濾（group = 全部、personal = 只該 actor）
// 故此元件不再接 actorName prop。`timeWindow` 取代舊的 `window` 以避免 shadow global。
const TemporalSankey = ({ events, timeWindow = 30 }) => {
  const [hover, setHover] = useState(null);

  const { layout, total, maxEdge } = useMemo(() => {
    const { transitions, catFromTotal, catToTotal } = buildTemporalFlow(events, { window: timeWindow });
    const cats = [...new Set([...catFromTotal.keys(), ...catToTotal.keys()])]
      .sort((a, b) => ((catFromTotal.get(b) || 0) + (catToTotal.get(b) || 0))
                    - ((catFromTotal.get(a) || 0) + (catToTotal.get(a) || 0)));

    if (!cats.length) {
      return { layout: null, total: 0, maxEdge: 0 };
    }

    const availH = H - PAD_Y * 2;
    const leftTotal = [...catFromTotal.values()].reduce((a, b) => a + b, 0);
    const rightTotal = [...catToTotal.values()].reduce((a, b) => a + b, 0);
    const leftUnit = leftTotal > 0 ? (availH - GAP * (cats.length - 1)) / leftTotal : 0;
    const rightUnit = rightTotal > 0 ? (availH - GAP * (cats.length - 1)) / rightTotal : 0;

    const left = new Map();
    const right = new Map();
    let ly = PAD_Y;
    let ry = PAD_Y;
    for (const c of cats) {
      const lOut = catFromTotal.get(c) || 0;
      const lH = Math.max(6, lOut * leftUnit);
      left.set(c, { y: ly, h: lH, total: lOut });
      ly += lH + GAP;

      const rIn = catToTotal.get(c) || 0;
      const rH = Math.max(6, rIn * rightUnit);
      right.set(c, { y: ry, h: rH, total: rIn });
      ry += rH + GAP;
    }

    // 對每一條 transition 排序，從左邊 source 與右邊 target 各自累進安排
    const entries = [...transitions.entries()].map(([k, count]) => {
      const [from, to] = k.split('|');
      return { key: k, from, to, count };
    });
    entries.sort((a, b) => b.count - a.count);

    const leftOffsets = new Map();   // cat → running y offset
    const rightOffsets = new Map();  // cat → running y offset
    const flows = [];

    // group by source
    const bySource = new Map();
    for (const e of entries) {
      if (!bySource.has(e.from)) bySource.set(e.from, []);
      bySource.get(e.from).push(e);
    }
    const byTarget = new Map();
    for (const e of entries) {
      if (!byTarget.has(e.to)) byTarget.set(e.to, []);
      byTarget.get(e.to).push(e);
    }

    // 計算每條 flow 在左邊起點的相對位置
    const leftFlowPos = new Map();
    for (const cat of cats) {
      const outs = bySource.get(cat) || [];
      const outTotal = outs.reduce((s, x) => s + x.count, 0);
      const unit = outTotal > 0 ? left.get(cat).h / outTotal : 0;
      let offset = 0;
      for (const e of outs) {
        const h = e.count * unit;
        leftFlowPos.set(e.key, { y: left.get(cat).y + offset, h });
        offset += h;
      }
    }
    const rightFlowPos = new Map();
    for (const cat of cats) {
      const ins = byTarget.get(cat) || [];
      const inTotal = ins.reduce((s, x) => s + x.count, 0);
      const unit = inTotal > 0 ? right.get(cat).h / inTotal : 0;
      let offset = 0;
      for (const e of ins) {
        const h = e.count * unit;
        rightFlowPos.set(e.key, { y: right.get(cat).y + offset, h });
        offset += h;
      }
    }

    const leftX = PAD_X;
    const rightX = W - PAD_X - COL_W;
    const midX = (leftX + COL_W + rightX) / 2;

    for (const e of entries) {
      const lp = leftFlowPos.get(e.key);
      const rp = rightFlowPos.get(e.key);
      if (!lp || !rp) continue;
      const x0 = leftX + COL_W;
      const x1 = rightX;
      const path = `M${x0},${lp.y} C${midX},${lp.y} ${midX},${rp.y} ${x1},${rp.y}
                    L${x1},${rp.y + rp.h} C${midX},${rp.y + rp.h} ${midX},${lp.y + lp.h} ${x0},${lp.y + lp.h} Z`;
      flows.push({ ...e, path, fromCat: e.from, toCat: e.to });
    }

    const max = entries.reduce((m, e) => Math.max(m, e.count), 0);
    const leftTotalSum = [...catFromTotal.values()].reduce((a, b) => a + b, 0);

    return {
      layout: {
        cats,
        left,
        right,
        flows,
        leftX,
        rightX,
      },
      total: leftTotalSum,
      maxEdge: max,
    };
  }, [events, timeWindow]);

  if (!layout || total === 0) {
    return (
      <div className="flex items-center justify-center bg-[#FAFBFC] rounded-lg border border-gray-200" style={{ aspectRatio: `${W} / ${H}` }}>
        <p className="text-body-sm text-gray-500">這個時間範圍裡沒找到連續行為（可以試著把視窗拉長）</p>
      </div>
    );
  }

  const { cats, left, right, flows, leftX, rightX } = layout;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="bg-[#FAFBFC] rounded-lg" style={{ width: '100%', height: '100%', maxHeight: '100%' }}>
        <text x={leftX + COL_W / 2} y={16} textAnchor="middle" fontSize={12} fill="#6B7280" fontFamily="'Noto Serif TC', serif">
          先做的事 ▶
        </text>
        <text x={rightX + COL_W / 2} y={16} textAnchor="middle" fontSize={12} fill="#6B7280" fontFamily="'Noto Serif TC', serif">
          接著做的事
        </text>

        {/* flows */}
        {flows.map((f) => {
          const color = colorForCat(f.fromCat);
          const isHover = hover?.type === 'flow' && hover.key === f.key;
          const relatedToNode = hover?.type === 'node'
            && ((hover.side === 'left' && hover.cat === f.fromCat) || (hover.side === 'right' && hover.cat === f.toCat));
          const dim = hover && !isHover && !relatedToNode;
          const isSelfLoop = f.fromCat === f.toCat;
          return (
            <path
              key={f.key}
              d={f.path}
              fill={color}
              fillOpacity={isHover ? 0.8 : dim ? 0.05 : (isSelfLoop ? 0.22 : 0.38)}
              stroke="none"
              onMouseEnter={() => setHover({ type: 'flow', key: f.key, from: f.fromCat, to: f.toCat, count: f.count })}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer', transition: 'fill-opacity 150ms' }}
            />
          );
        })}

        {/* left nodes (source) */}
        {cats.map((c) => {
          const L = left.get(c);
          const fill = colorForCat(c);
          const isHover = hover?.type === 'node' && hover.side === 'left' && hover.cat === c;
          const relatedFlow = hover?.type === 'flow' && hover.from === c;
          const dim = hover && !isHover && !relatedFlow;
          return (
            <g key={`L:${c}`}
               onMouseEnter={() => setHover({ type: 'node', side: 'left', cat: c, count: L.total })}
               onMouseLeave={() => setHover(null)}
               style={{ cursor: 'pointer' }}>
              <rect x={leftX} y={L.y} width={COL_W} height={L.h} fill={fill} fillOpacity={dim ? 0.3 : 0.95} rx={3}
                    style={{ transition: 'fill-opacity 150ms' }} />
              <text x={leftX + COL_W - 6} y={L.y + L.h / 2 + 4} textAnchor="end" fontSize={11} fill="#fff"
                    fontFamily="'Noto Serif TC', serif" pointerEvents="none" fontWeight={500}>
                {trimLabel(c, 12)} · {L.total}
              </text>
            </g>
          );
        })}

        {/* right nodes (target) */}
        {cats.map((c) => {
          const R = right.get(c);
          const fill = colorForCat(c);
          const isHover = hover?.type === 'node' && hover.side === 'right' && hover.cat === c;
          const relatedFlow = hover?.type === 'flow' && hover.to === c;
          const dim = hover && !isHover && !relatedFlow;
          return (
            <g key={`R:${c}`}
               onMouseEnter={() => setHover({ type: 'node', side: 'right', cat: c, count: R.total })}
               onMouseLeave={() => setHover(null)}
               style={{ cursor: 'pointer' }}>
              <rect x={rightX} y={R.y} width={COL_W} height={R.h} fill={fill} fillOpacity={dim ? 0.3 : 0.95} rx={3}
                    style={{ transition: 'fill-opacity 150ms' }} />
              <text x={rightX + 6} y={R.y + R.h / 2 + 4} textAnchor="start" fontSize={11} fill="#fff"
                    fontFamily="'Noto Serif TC', serif" pointerEvents="none" fontWeight={500}>
                {trimLabel(c, 12)} · {R.total}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div className="absolute bottom-2 left-2 bg-white/95 border border-gray-200 rounded-md px-3 py-2 text-caption shadow-sm pointer-events-none">
          {hover.type === 'flow' ? (
            <>
              <div className="font-medium text-gray-800">
                {hover.from === hover.to ? '連續做同類的事' : '先做 → 接著做'}
              </div>
              <div className="text-gray-500">
                {hover.from} → {hover.to}・{hover.count} 次
                <span className="text-gray-400"> · 佔 {total > 0 ? Math.round((hover.count / total) * 100) : 0}%</span>
              </div>
            </>
          ) : (
            <>
              <div className="font-medium text-gray-800">
                {hover.cat}（{hover.side === 'left' ? '做完這類活動後' : '這類活動是接續在別的事後面'}）
              </div>
              <div className="text-gray-500">{hover.count} 次先後組合</div>
            </>
          )}
        </div>
      )}

      <div className="absolute top-2 right-3 text-[10px] text-gray-400 font-sans">
        共 {total} 次先後組合 · 最常見 {maxEdge} 次
      </div>
    </div>
  );
};

export default TemporalSankey;
