import React, { useMemo, useState } from 'react';
import { CAT_COLOR } from '../utils/actionMeta';
import { buildEventAggregates } from '../utils/buildGraph';

const W = 960;
const H = 560;
const CX = W / 2;
const CY = H / 2;
const INNER_R = 80;
const INNER_R2 = 140;
const OUTER_R = 240;
const TAU = Math.PI * 2;

const polar = (r, theta) => ({ x: CX + r * Math.cos(theta - Math.PI / 2), y: CY + r * Math.sin(theta - Math.PI / 2) });

const arcPath = (r0, r1, a0, a1) => {
  if (a1 - a0 >= TAU - 1e-6) {
    // full circle
    const p0 = polar(r1, 0);
    const p1 = polar(r1, Math.PI);
    const q0 = polar(r0, Math.PI);
    const q1 = polar(r0, 0);
    return `M${p0.x},${p0.y} A${r1},${r1} 0 1 1 ${p1.x},${p1.y} A${r1},${r1} 0 1 1 ${p0.x},${p0.y}
            M${q0.x},${q0.y} A${r0},${r0} 0 1 0 ${q1.x},${q1.y} A${r0},${r0} 0 1 0 ${q0.x},${q0.y} Z`;
  }
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p0 = polar(r1, a0);
  const p1 = polar(r1, a1);
  const p2 = polar(r0, a1);
  const p3 = polar(r0, a0);
  return `M${p0.x},${p0.y} A${r1},${r1} 0 ${large} 1 ${p1.x},${p1.y} L${p2.x},${p2.y} A${r0},${r0} 0 ${large} 0 ${p3.x},${p3.y} Z`;
};

const labelForArc = (r, a0, a1, label, count, limit = 18) => {
  const mid = (a0 + a1) / 2;
  const p = polar(r, mid);
  const angle = ((mid * 180) / Math.PI) - 90;
  const flip = angle > 90 && angle < 270;
  const rotation = flip ? angle + 180 : angle;
  const trimmed = label.length > limit ? `${label.slice(0, limit - 1)}…` : label;
  return (
    <text
      x={p.x}
      y={p.y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={10}
      fill="#fff"
      fontFamily="'Noto Serif TC', serif"
      transform={`rotate(${rotation}, ${p.x}, ${p.y})`}
      pointerEvents="none"
    >
      {trimmed}（{count}）
    </text>
  );
};

const colorForCat = (cat) => CAT_COLOR[cat] || CAT_COLOR['其他'];

// tint: 調整亮度（t=0.3 偏亮、t=-0.3 偏暗）
const tint = (hex, t) => {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const mix = (v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t));
  const hex2 = (v) => v.toString(16).padStart(2, '0');
  return `#${hex2(mix(r))}${hex2(mix(g))}${hex2(mix(b))}`;
};

const RadialSunburst = ({ events, level, actorName, centerLabel }) => {
  const agg = useMemo(() => buildEventAggregates(events), [events]);
  const [hover, setHover] = useState(null); // { key, cat, label, count }

  const { inner, outer, total } = useMemo(() => {
    // level=group: inner=actor, outer=category
    // level=personal: inner=category, outer=targetType
    if (level === 'group') {
      const inner = [...agg.byActor.entries()]
        .map(([actor, count]) => ({ key: `a:${actor}`, label: actor, count }))
        .sort((a, b) => b.count - a.count);
      const outer = [];
      for (const slice of inner) {
        const actor = slice.label;
        const subs = [];
        for (const [k, n] of agg.actorToCat.entries()) {
          const [a, cat] = k.split('|');
          if (a !== actor) continue;
          subs.push({ key: `${slice.key}|${cat}`, parent: slice.key, label: cat, cat, count: n });
        }
        subs.sort((a, b) => b.count - a.count);
        outer.push(...subs);
      }
      const total = inner.reduce((s, x) => s + x.count, 0);
      return { inner, outer, total };
    }
    // personal
    const mine = [...agg.byCategory.entries()];
    const inner = mine
      .map(([cat, count]) => ({ key: `c:${cat}`, label: cat, count, cat }))
      .sort((a, b) => b.count - a.count);
    const outer = [];
    for (const slice of inner) {
      const cat = slice.label;
      const subs = [];
      for (const [k, n] of agg.catToTargetType.entries()) {
        const [c, tt] = k.split('|');
        if (c !== cat) continue;
        subs.push({ key: `${slice.key}|${tt}`, parent: slice.key, label: tt, cat, count: n });
      }
      subs.sort((a, b) => b.count - a.count);
      outer.push(...subs);
    }
    const total = inner.reduce((s, x) => s + x.count, 0);
    return { inner, outer, total };
  }, [agg, level]);

  // 計算每個內層 slice 的角度
  const innerArcs = useMemo(() => {
    let a = 0;
    return inner.map(s => {
      const a0 = a;
      const a1 = total > 0 ? a + (s.count / total) * TAU : a;
      a = a1;
      return { ...s, a0, a1 };
    });
  }, [inner, total]);

  const innerByKey = useMemo(() => Object.fromEntries(innerArcs.map(s => [s.key, s])), [innerArcs]);

  const outerArcs = useMemo(() => {
    const grouped = {};
    for (const o of outer) {
      if (!grouped[o.parent]) grouped[o.parent] = [];
      grouped[o.parent].push(o);
    }
    const results = [];
    for (const parentKey of Object.keys(grouped)) {
      const parent = innerByKey[parentKey];
      if (!parent) continue;
      const parentSpan = parent.a1 - parent.a0;
      const parentTotal = grouped[parentKey].reduce((s, x) => s + x.count, 0);
      let a = parent.a0;
      for (const o of grouped[parentKey]) {
        const a0 = a;
        const a1 = parentTotal > 0 ? a + (o.count / parentTotal) * parentSpan : a;
        a = a1;
        results.push({ ...o, a0, a1, parentLabel: parent.label });
      }
    }
    return results;
  }, [outer, innerByKey]);

  if (!total) {
    return (
      <div className="flex items-center justify-center bg-[#FAFBFC] rounded-lg border border-gray-200" style={{ aspectRatio: `${W} / ${H}` }}>
        <p className="text-body-sm text-gray-500">這個時間範圍裡還沒有活動紀錄</p>
      </div>
    );
  }

  // 預先把每個 slice 的顏色算好，避免在 map 中 innerArcs.indexOf（O(N²)）
  const sliceColors = new Map(
    innerArcs.map((s, i) => [
      s.key,
      level === 'group' ? tint('#5BA491', 0.05 - i * 0.08) : colorForCat(s.cat),
    ])
  );
  const innerColorFor = (s) => sliceColors.get(s.key) || '#5BA491';

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="bg-[#FAFBFC] rounded-lg"
        style={{ width: '100%', height: '100%', maxHeight: '100%' }}
      >
        {/* outer ring */}
        {outerArcs.map((o) => {
          const base = colorForCat(o.cat);
          const fill = level === 'group' ? base : tint(base, 0.15);
          const highlighted = hover && (hover.key === o.key || hover.parent === o.parent);
          return (
            <g key={o.key}
               onMouseEnter={() => setHover(o)}
               onMouseLeave={() => setHover(null)}
               style={{ cursor: 'pointer' }}>
              <path
                d={arcPath(INNER_R2, OUTER_R, o.a0, o.a1)}
                fill={fill}
                fillOpacity={hover && !highlighted ? 0.25 : 0.9}
                stroke="#fff"
                strokeWidth={1}
                style={{ transition: 'fill-opacity 150ms' }}
              />
              {o.a1 - o.a0 > 0.1 && labelForArc((INNER_R2 + OUTER_R) / 2, o.a0, o.a1, o.label, o.count, 10)}
            </g>
          );
        })}
        {/* inner ring */}
        {innerArcs.map((s) => {
          const fill = innerColorFor(s);
          const highlighted = hover && (hover.key === s.key || hover.parent === s.key);
          return (
            <g key={s.key}
               onMouseEnter={() => setHover(s)}
               onMouseLeave={() => setHover(null)}
               style={{ cursor: 'pointer' }}>
              <path
                d={arcPath(INNER_R, INNER_R2, s.a0, s.a1)}
                fill={fill}
                fillOpacity={hover && !highlighted ? 0.25 : 0.95}
                stroke="#fff"
                strokeWidth={1}
                style={{ transition: 'fill-opacity 150ms' }}
              />
              {s.a1 - s.a0 > 0.12 && labelForArc((INNER_R + INNER_R2) / 2, s.a0, s.a1, s.label, s.count, 14)}
            </g>
          );
        })}
        {/* center */}
        <circle cx={CX} cy={CY} r={INNER_R - 2} fill="#fff" stroke="#E5E7EB" strokeWidth={1.5} />
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize={12} fill="#6B7280" fontFamily="'Noto Serif TC', serif">
          {level === 'group' ? '全組合計' : '只看一人'}
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize={13} fontWeight={600} fill="#1F2937" fontFamily="'Noto Serif TC', serif">
          {centerLabel || (level === 'personal' ? actorName : '')}
        </text>
        <text x={CX} y={CY + 26} textAnchor="middle" fontSize={11} fill="#9CA3AF" fontFamily="'Noto Serif TC', serif">
          共 {total} 次活動
        </text>
      </svg>
      {hover && (
        <div className="absolute bottom-2 left-2 bg-white/95 border border-gray-200 rounded-md px-3 py-2 text-caption shadow-sm pointer-events-none">
          <div className="font-medium text-gray-800">{hover.label}</div>
          <div className="text-gray-500">
            {hover.parent && innerByKey[hover.parent] ? `${innerByKey[hover.parent].label} · ` : ''}
            {hover.count} 次（佔 {total > 0 ? Math.round((hover.count / total) * 100) : 0}%）
          </div>
        </div>
      )}
    </div>
  );
};

export default RadialSunburst;
