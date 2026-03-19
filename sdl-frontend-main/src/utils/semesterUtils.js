/**
 * 台灣學期計算工具
 *
 * 學年度以「開始那年的民國年份」命名（依教育部《各級學校學生學年學期假期辦法》）
 * 114 學年度 = 2025/8/1 ~ 2026/7/31
 * 第 1 學期：8 月 ~ 隔年 1 月（學年開始年份）
 * 第 2 學期：2 月 ~ 7 月（學年結束年份，即開始年份的隔年）
 */

/**
 * 根據日期計算台灣學期代碼
 * @param {Date} [date=new Date()] - 要計算的日期
 * @returns {string} 學期代碼，例如 "114-2"
 */
export function getTaiwanSemester(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  if (month >= 2 && month <= 7) {
    // 第 2 學期：2 月 ~ 7 月
    // 學年度以「前一年」命名（例如 2026年3月 → 114學年度，因學年始於2025年8月）
    const academicYear = (year - 1) - 1911;
    return `${academicYear}-2`;
  } else {
    // 第 1 學期：8 月 ~ 隔年 1 月
    const baseYear = month === 1 ? year - 1 : year;
    const academicYear = baseYear - 1911;
    return `${academicYear}-1`;
  }
}

/**
 * 取得當前學期代碼
 * @returns {string} 當前學期代碼
 */
export function getCurrentSemester() {
  return getTaiwanSemester(new Date());
}

/**
 * 將學期代碼轉為可讀標籤
 * @param {string} semesterCode - 學期代碼，例如 "114-1"
 * @returns {string} 例如 "114 學年度 第 1 學期"
 */
export function getSemesterLabel(semesterCode) {
  if (!semesterCode) return '未知學期';
  const [year, sem] = semesterCode.split('-');
  return `${year} 學年度 第 ${sem} 學期`;
}
