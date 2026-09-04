/**
 * CSP 違規回報端點
 *
 * nginx 對前端頁面送 Content-Security-Policy-Report-Only（見 repo 根目錄 nginx.conf），
 * report-uri 指到 POST /api/csp-report。這裡只做一件事：把違規摘要寫進日誌，
 * 讓 CSP 轉成正式強制前能先看到真實流量下有哪些來源會被擋（future-list F023）。
 *
 * - 不需登入（瀏覽器自動送出，不帶憑證）
 * - 不入 DB、不信任 body：只取固定幾個欄位、截斷長度、去掉 URL 的 query/fragment
 * - 有 rate limit，避免被灌爆日誌
 */
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const logger = require('../config/logger');

const router = express.Router();

const MAX_FIELD_LENGTH = 300;
const MAX_REPORTS_PER_REQUEST = 20;
const MAX_BODY_BYTES = 32 * 1024;

// report-uri 的內容型別是 application/csp-report；Reporting API 則是 application/reports+json
const parseReport = express.json({
  type: ['application/csp-report', 'application/reports+json', 'application/json'],
  limit: '32kb',
});

// server.js 的全域 express.json({ limit: '10mb' }) 會先解析 application/json，下方 parseReport 的 32kb 上限只對
// 其他兩種內容型別生效；這裡用 Content-Length 統一擋掉過大的請求
function rejectOversized(req, res, next) {
  const length = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return res.status(413).end();
  }
  next();
}

const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

function clip(value) {
  if (value === null || value === undefined) return null;
  const str = String(value);
  return str.length > MAX_FIELD_LENGTH ? `${str.slice(0, MAX_FIELD_LENGTH)}…` : str;
}

// 文件 URL 可能帶 query／fragment（例如密碼重設 token），只留 origin + path
function stripUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const u = new URL(value);
    return clip(`${u.origin}${u.pathname}`);
  } catch (_) {
    return clip(value.split(/[?#]/)[0]);
  }
}

function pickFields(r) {
  if (!r || typeof r !== 'object') return null;
  return {
    documentUri: stripUrl(r['document-uri'] ?? r.documentURL),
    blockedUri: stripUrl(r['blocked-uri'] ?? r.blockedURL),
    effectiveDirective: clip(r['effective-directive'] ?? r.effectiveDirective),
    violatedDirective: clip(r['violated-directive'] ?? r.violatedDirective ?? null),
    sourceFile: stripUrl(r['source-file'] ?? r.sourceFile),
    lineNumber: Number.isFinite(Number(r['line-number'] ?? r.lineNumber)) ? Number(r['line-number'] ?? r.lineNumber) : null,
    disposition: clip(r.disposition),
  };
}

// 兩種格式：{ "csp-report": {...} }（report-uri）或 [{ type: 'csp-violation', body: {...} }]（Reporting API）
function normalize(body) {
  if (Array.isArray(body)) {
    return body
      .slice(0, MAX_REPORTS_PER_REQUEST)
      .filter((item) => item && item.type === 'csp-violation')
      .map((item) => pickFields(item.body))
      .filter(Boolean);
  }
  if (body && typeof body === 'object' && body['csp-report']) {
    const one = pickFields(body['csp-report']);
    return one ? [one] : [];
  }
  return [];
}

router.post('/csp-report', reportLimiter, rejectOversized, parseReport, (req, res) => {
  const reports = normalize(req.body);
  for (const report of reports) {
    logger.warn({ csp: report }, '[csp] 違規回報');
  }
  res.status(204).end();
});

module.exports = router;
module.exports.normalize = normalize;
