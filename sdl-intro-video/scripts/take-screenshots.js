const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:8080";
const ACCOUNT = "stone881129";
const PASSWORD = "0921457822a";
const PROJECT_ID = 8;
const DIR = path.join(__dirname, "../public/screenshots");

/** 強制關閉所有 modal */
async function closeModals(page) {
  for (let i = 0; i < 4; i++) {
    try { await page.keyboard.press("Escape"); } catch (_) {}
    await page.waitForTimeout(300);
  }
  // 點擊 overlay 背景
  const overlay = page.locator('.fixed.inset-0, [class*="bg-black"], [class*="overlay"]').first();
  if (await overlay.count() > 0) {
    try { await overlay.click({ force: true, position: { x: 10, y: 10 } }); } catch (_) {}
    await page.waitForTimeout(400);
  }
  // 點擊關閉按鈕
  const close = page.locator('button[aria-label="Close"], button:has-text("關閉"), button:has-text("取消"), .modal button').first();
  if (await close.count() > 0) {
    try { await close.click({ force: true }); } catch (_) {}
    await page.waitForTimeout(300);
  }
}

async function go(page, url, ms = 2500) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(ms);
  await closeModals(page);
}

async function shot(page, name) {
  const file = path.join(DIR, name);
  await page.screenshot({ path: file });
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`  ✓ ${name}  (${kb} KB)`);
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  console.log("📸 開始截圖...\n");

  // 登入
  await go(page, `${BASE_URL}/login`, 1000);
  await shot(page, "01-login.png");
  await page.fill('input[type="text"]', ACCOUNT);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await closeModals(page);

  // 儀表板
  await go(page, `${BASE_URL}/homepage`, 2000);
  await shot(page, "02-dashboard.png");

  // 看板 — 關 modal 後截圖
  await go(page, `${BASE_URL}/project/${PROJECT_ID}/kanban`, 3000);
  await closeModals(page);
  await shot(page, "04-kanban.png");

  // 看板 — 點擊「新增任務」按鈕（column header 的 + 或綠色按鈕）
  // 先用 JS 點擊第一個「新增任務」相關按鈕
  const clicked = await page.evaluate(() => {
    // 找到有 KANBAN_COLUMN_CREATE_OPEN 的按鈕
    const btns = document.querySelectorAll('[data-track-action="KANBAN_COLUMN_CREATE_OPEN"]');
    if (btns.length > 0) { btns[0].click(); return true; }
    // 找包含「新增」文字的按鈕
    const all = Array.from(document.querySelectorAll('button'));
    const btn = all.find(b => b.textContent.trim().includes('新增') || b.textContent.trim().includes('+'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  await page.waitForTimeout(1200);
  await shot(page, "04c-kanban-create.png");
  await closeModals(page);

  // 想法牆
  await go(page, `${BASE_URL}/project/${PROJECT_ID}/ideaWall`, 3000);
  await closeModals(page);
  await shot(page, "05-idea-wall.png");

  // 想法牆 — 點擊新增節點
  const fabClicked = await page.evaluate(() => {
    // 找右下角 FAB
    const btns = Array.from(document.querySelectorAll('button'));
    const fab = btns.find(b => {
      const s = window.getComputedStyle(b);
      return b.className.includes('fixed') || b.className.includes('rounded-full');
    });
    if (fab) { fab.click(); return true; }
    // 找包含「新增」或「節點」的按鈕
    const btn = btns.find(b => b.textContent.includes('節點') || b.textContent.includes('新增'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  await page.waitForTimeout(1200);
  await shot(page, "05c-idea-wall-create.png");
  await closeModals(page);

  // 提交任務
  await go(page, `${BASE_URL}/project/${PROJECT_ID}/submitTask`, 2000);
  await closeModals(page);
  await shot(page, "06-submit.png");

  // 反思日誌
  await go(page, `${BASE_URL}/project/${PROJECT_ID}/reflection`, 2000);
  await closeModals(page);
  await shot(page, "07-reflection.png");

  // 作品集
  await go(page, `${BASE_URL}/project/${PROJECT_ID}/protfolio`, 2500);
  await closeModals(page);
  await shot(page, "08-portfolio.png");

  // 學生進度儀表板
  await go(page, `${BASE_URL}/project/${PROJECT_ID}/studentDashboard`, 2500);
  await closeModals(page);
  await shot(page, "09-student-dashboard.png");

  await browser.close();
  const files = fs.readdirSync(DIR).filter(f => f.endsWith(".png"));
  console.log(`\n✅ 共 ${files.length} 張`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
