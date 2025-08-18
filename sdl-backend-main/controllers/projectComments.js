const ProjectComment = require('../models/project_comment');
const ProjectCommentLike = require('../models/project_comment_like');
const ProjectCommentAttachment = require('../models/project_comment_attachment');
const Project = require('../models/project');
const User = require('../models/user');
const { deleteFileFromMinio } = require('../config/minio');

// GET /api/projects/:projectId/comments
exports.listByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const currentUserId = req.userId;

    const comments = await ProjectComment.findAll({
      where: { projectId },
      // Return in chronological order so frontend can render directly
      order: [['createdAt', 'ASC']],
      include: [
        { model: User, attributes: ['id', 'username'] },
        { model: ProjectCommentLike, as: 'likes', attributes: ['userId'] },
        { model: ProjectCommentAttachment, as: 'attachments' },
      ],
    });

    const items = comments.map((c) => {
      const json = c.toJSON();
      const likesArr = Array.isArray(json.likes) ? json.likes : [];
      const likeCount = likesArr.length;
      const likedByCurrentUser = !!currentUserId && likesArr.some(l => parseInt(l.userId) === parseInt(currentUserId));
      delete json.likes;
      return { ...json, likeCount, likedByCurrentUser };
    });

    // Build a lookup to enrich reply target user when parentId exists;
    // Prefer denormalized username if present.
    const idToUser = new Map(items.map(i => [i.id, {
      id: i.user?.id || null,
      username: i.user?.username || i.username || null,
    }]));
    const enriched = items.map(i => {
      if (!i.parentId) return { ...i, replyToUser: null };
      const denormName = i.reply_to_username || null;
      const parentUser = denormName ? { id: i.parentId, username: denormName } : (idToUser.get(i.parentId) || null);
      return { ...i, replyToUser: parentUser };
    });

    res.json({ items: enriched });
  } catch (err) {
    console.error('listByProject error:', err);
    res.status(500).json({ message: '取得專案評論失敗', error: err.message });
  }
};

// POST /api/projects/:projectId/comments
exports.create = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: '內容不可為空' });
    }

    const project = await Project.findByPk(projectId);
    if (!project) return res.status(404).json({ message: '專案不存在' });

    // Fetch current user's username for denormalization
    const author = await User.findByPk(userId, { attributes: ['id', 'username'] });

    // If replying, fetch parent to snapshot username/content
    let replyToUsername = null;
    let replyToContent = null;
    if (parentId) {
      const parent = await ProjectComment.findByPk(parentId, { attributes: ['id', 'content', 'username'], include: [{ model: User, attributes: ['username'] }] });
      if (parent) {
        replyToUsername = parent.username || parent.user?.username || null;
        replyToContent = parent.content || null;
      }
    }

    const created = await ProjectComment.create({
      content: content.trim(),
      parentId: parentId || null,
      userId,
      projectId,
      username: author?.username || null,
      reply_to_username: replyToUsername,
      reply_to_content: replyToContent,
    });

    const enriched = await ProjectComment.findByPk(created.id, {
      include: [
        { model: User, attributes: ['id', 'username'] },
        { model: ProjectCommentAttachment, as: 'attachments' },
      ],
    });

    // shape response similar to listByProject
    const json = enriched.toJSON();
    const replyToUser = json.parentId && (json.reply_to_username ? { id: json.parentId, username: json.reply_to_username } : null);
    res.status(201).json({ item: { ...json, replyToUser, likeCount: 0, likedByCurrentUser: false } });
  } catch (err) {
    console.error('create project comment error:', err);
    res.status(500).json({ message: '新增評論失敗', error: err.message });
  }
};

// PUT /api/project-comments/:commentId
exports.update = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await ProjectComment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: '評論不存在' });

    if (parseInt(comment.userId) !== parseInt(req.userId)) {
      return res.status(403).json({ message: '僅能編輯自己的評論' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: '內容不可為空' });
    }

    await comment.update({ content: content.trim() });
    const updated = await ProjectComment.findByPk(comment.id, {
      include: [{ model: User, attributes: ['id', 'username'] }],
    });
    res.json({ item: updated });
  } catch (err) {
    console.error('update project comment error:', err);
    res.status(500).json({ message: '更新評論失敗', error: err.message });
  }
};

// DELETE /api/project-comments/:commentId
exports.remove = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await ProjectComment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: '評論不存在' });

    if (parseInt(comment.userId) !== parseInt(req.userId)) {
      return res.status(403).json({ message: '僅能刪除自己的評論' });
    }

    await comment.destroy();
    res.json({ message: '已刪除' });
  } catch (err) {
    console.error('remove project comment error:', err);
    res.status(500).json({ message: '刪除評論失敗', error: err.message });
  }
};

// POST /api/project-comments/:commentId/like
exports.toggleLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    const comment = await ProjectComment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: '評論不存在' });

    const existing = await ProjectCommentLike.findOne({ where: { commentId, userId } });
    if (existing) {
      await existing.destroy();
    } else {
      await ProjectCommentLike.create({ commentId, userId });
    }

    const likeCount = await ProjectCommentLike.count({ where: { commentId } });
    res.json({ liked: !existing, likeCount });
  } catch (err) {
    console.error('toggle project comment like error:', err);
    res.status(500).json({ message: '按讚操作失敗', error: err.message });
  }
};

// POST /api/project-comments/:commentId/attachments
exports.addAttachments = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await ProjectComment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: '評論不存在' });

    const files = req.uploadedFiles || [];
    if (!files.length) return res.status(400).json({ message: '未選擇檔案' });

    const rows = files.map((f) => ({
      commentId: comment.id,
      fileName: f.fileName,
      originalName: f.originalName,
      mimeType: f.mimeType,
      fileUrl: f.url,
      comment_content: comment.content,
    }));

    await ProjectCommentAttachment.bulkCreate(rows);

    const updated = await ProjectComment.findByPk(comment.id, {
      include: [
        { model: User, attributes: ['id', 'username'] },
        { model: ProjectCommentAttachment, as: 'attachments' },
        { model: ProjectCommentLike, as: 'likes', attributes: ['userId'] },
      ],
    });

    res.status(201).json({ item: updated });
  } catch (err) {
    console.error('add project comment attachments error:', err);
    res.status(500).json({ message: '附件上傳失敗', error: err.message });
  }
};

// DELETE /api/project-comments/attachments/:attachmentId
exports.removeAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const userId = req.userId;

    const attachment = await ProjectCommentAttachment.findByPk(attachmentId);
    if (!attachment) return res.status(404).json({ message: '附件不存在' });

    const comment = await ProjectComment.findByPk(attachment.commentId);
    if (!comment) return res.status(404).json({ message: '附件所屬評論不存在' });

    if (parseInt(comment.userId) !== parseInt(userId)) {
      return res.status(403).json({ message: '僅能刪除自己評論的附件' });
    }

    // Best effort: also delete object from MinIO
    try {
      if (attachment.fileName) {
        await deleteFileFromMinio(attachment.fileName);
      }
    } catch (err) {
      console.warn('刪除 MinIO 檔案失敗，僅刪除資料庫記錄:', err?.message || err);
    }

    await attachment.destroy();
    res.json({ message: '附件已刪除' });
  } catch (err) {
    console.error('remove project comment attachment error:', err);
    res.status(500).json({ message: '刪除附件失敗', error: err.message });
  }
};
