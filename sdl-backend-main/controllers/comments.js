const Sequelize = require('sequelize');
const Comment = require('../models/comment');
const CommentLike = require('../models/comment_like');
const CommentAttachment = require('../models/comment_attachment');
const Task = require('../models/task');
const User = require('../models/user');
const { logAudit, clampMetadataSize } = require('../services/auditService');
const sequelize = require('../util/database');

// GET /api/tasks/:taskId/comments
exports.listByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const currentUserId = req.userId;

    const comments = await Comment.findAll({
      where: { taskId },
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, attributes: ['id', 'username', 'class', 'seatNumber', 'role'] },
        { model: CommentAttachment, as: 'attachments' },
        { model: CommentLike, as: 'likes', attributes: ['userId'] },
      ],
    });

    const data = comments.map((c) => {
      const json = c.toJSON();
      const likesArr = Array.isArray(json.likes) ? json.likes : [];
      const likeCount = likesArr.length;
      const likedByCurrentUser = !!currentUserId && likesArr.some(l => parseInt(l.userId) === parseInt(currentUserId));
      delete json.likes;
      return { ...json, likeCount, likedByCurrentUser };
    });

    res.json({ items: data });
  } catch (err) {
    console.error('listByTask error:', err);
    res.status(500).json({ message: '取得評論列表失敗', error: err.message });
  }
};

// POST /api/tasks/:taskId/comments
exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { taskId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: '內容不可為空' });
    }

    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ message: '任務不存在' });

    // Resolve username snapshot
    let username = null;
    try {
      const user = await User.findByPk(userId);
      username = user?.username || null;
    } catch (_) {}

    const comment = await Comment.create({
      content: content.trim(),
      taskId: taskId,
      userId: userId,
      username,
      parentId: parentId || null,
      task_title: task?.title || null,
      task_content: task?.content || null,
    }, { req, transaction: t });

    // Attachments from MinIO upload middleware
    const files = req.uploadedFiles || [];
    if (files.length > 0) {
      const rows = files.map((f) => ({
        commentId: comment.id,
        fileName: f.fileName,
        originalName: f.originalName,
        mimeType: f.mimeType,
        fileUrl: f.url,
        comment_content: comment.content,
      }));
      await CommentAttachment.bulkCreate(rows, { transaction: t });

      // Audit: attachments added to a task comment
      await logAudit(req, {
        action: 'COMMENT_ADD_ATTACHMENTS',
        targetType: 'comment',
        targetId: comment.id,
        projectId: req.body.projectId || null,
        metadata: clampMetadataSize({ files: files.map(f => ({ name: f.originalName || f.fileName, size: f.size, mimeType: f.mimeType })) })
      });
    }

    await t.commit();
    // Return enriched record
    const created = await Comment.findByPk(comment.id, {
      include: [
        { model: User, attributes: ['id', 'username', 'class', 'seatNumber', 'role'] },
        { model: CommentAttachment, as: 'attachments' },
      ],
    });

    res.status(201).json({ item: created, likeCount: 0 });
  } catch (err) {
    console.error('create comment error:', err);
    try { await t.rollback(); } catch (_) {}
    res.status(500).json({ message: '新增評論失敗', error: err.message });
  }
};

// PUT /api/comments/:commentId
exports.update = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await Comment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: '評論不存在' });

    if (comment.userId !== req.userId) {
      return res.status(403).json({ message: '僅能編輯自己的評論' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: '內容不可為空' });
    }

    await comment.update({ content: content.trim() }, { req });
    const updated = await Comment.findByPk(comment.id, {
      include: [
        { model: User, attributes: ['id', 'username', 'class', 'seatNumber', 'role'] },
        { model: CommentAttachment, as: 'attachments' },
      ],
    });
    res.json({ item: updated });
  } catch (err) {
    console.error('update comment error:', err);
    res.status(500).json({ message: '更新評論失敗', error: err.message });
  }
};

// DELETE /api/comments/:commentId
exports.remove = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: '評論不存在' });

    // 簡化策略：作者或具寫入權限的成員可刪除
    if (comment.userId !== req.userId) {
      // 若非作者，仍可由 checkWritePermission 保障權限
      // 這裡不再做額外角色檢查
    }

    await comment.destroy({ req });
    res.json({ message: '已刪除' });
  } catch (err) {
    console.error('remove comment error:', err);
    res.status(500).json({ message: '刪除評論失敗', error: err.message });
  }
};

// POST /api/comments/:commentId/like
exports.toggleLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    const comment = await Comment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: '評論不存在' });

    const existing = await CommentLike.findOne({ where: { commentId, userId } });
    if (existing) {
      await existing.destroy();
    } else {
      // Resolve username from token or DB
      let username = req.user?.username || null;
      if (!username) {
        try {
          const user = await User.findByPk(userId);
          username = user?.username || null;
        } catch (_) {}
      }

      // Snapshot comment content
      const targetComment = await Comment.findByPk(commentId);
      if (!targetComment) {
        return res.status(404).json({ message: 'Comment not found' });
      }

      await CommentLike.create({ 
        commentId, 
        userId,
        username,
        comment_content: targetComment.content,
      });
    }

    const likeCount = await CommentLike.count({ where: { commentId } });
    res.json({ liked: !existing, likeCount });
  } catch (err) {
    console.error('toggle like error:', err);
    res.status(500).json({ message: '按讚操作失敗', error: err.message });
  }
};
