const School = require('../models/school');
const { Op } = require('sequelize');

/**
 * 取得所有學校清單（供下拉選單使用，不需要登入）
 * GET /api/schools
 */
exports.getSchools = async (req, res) => {
    try {
        const schools = await School.findAll({
            attributes: ['id', 'name', 'type', 'city'],
            order: [['city', 'ASC'], ['name', 'ASC']]
        });

        res.status(200).json({
            message: '取得學校清單成功',
            schools
        });
    } catch (error) {
        console.error('取得學校清單錯誤:', error);
        res.status(500).json({
            message: '取得學校清單時發生錯誤',
            error: error.message
        });
    }
};
