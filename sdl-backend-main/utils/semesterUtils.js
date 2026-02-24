/**
 * 台灣學期計算工具
 *
 * 學年 = 西元年 - 1911
 * 第 1 學期：8 月 ~ 隔年 1 月
 * 第 2 學期：2 月 ~ 7 月
 */

/**
 * 根據日期計算台灣學期代碼
 * @param {Date} [date=new Date()] - 要計算的日期
 * @returns {string} 學期代碼，例如 "114-2"
 */
function getTaiwanSemester(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  if (month >= 2 && month <= 7) {
    // 第 2 學期：2 月 ~ 7 月
    const academicYear = year - 1911;
    return `${academicYear}-2`;
  } else {
    // 第 1 學期：8 月 ~ 隔年 1 月
    // 1 月時，學年是前一年開始的
    const baseYear = month === 1 ? year - 1 : year;
    const academicYear = baseYear - 1911;
    return `${academicYear}-1`;
  }
}

/**
 * 從日期字串計算學期代碼（用於回填現有資料）
 * @param {string} dateString - 日期字串
 * @returns {string} 學期代碼
 */
function getSemesterFromDate(dateString) {
  return getTaiwanSemester(new Date(dateString));
}

module.exports = { getTaiwanSemester, getSemesterFromDate };
