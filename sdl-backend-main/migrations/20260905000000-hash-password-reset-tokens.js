'use strict';

/**
 * 密碼重設 token 改為雜湊儲存（2026-09-05 資安審查）
 *
 * 背景：password_reset_tokens.token 原本存明文 UUID，資料庫或備份外洩時可直接拿去重設任何人的密碼。
 * 程式碼（controllers/passwordReset.js）從此只寫入／比對 sha256 hex。
 *
 * up：把仍是明文 UUID 的列（36 字元、含連字號）原地改成 sha256 hex，尚未過期的連結繼續有效。
 *     可重複執行：已雜湊的列長度為 64，不會被再次處理。
 * down：雜湊不可逆；回到明文版程式碼時只能清掉現有列（token 有效期 24 小時，使用者重新申請即可）。
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE password_reset_tokens
      SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex')
      WHERE length(token) = 36 AND token LIKE '%-%-%-%-%'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DELETE FROM password_reset_tokens');
  },
};
