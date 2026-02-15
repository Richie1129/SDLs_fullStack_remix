-- 查詢學生功能相關的 Audit Logs

-- 1. 統計各類型 Audit Log 數量
SELECT 
    action,
    COUNT(*) as count,
    MAX("createdAt") as latest
FROM audit_events
WHERE action IN (
    'AI_TASK_ASSISTANT_REQUEST',
    'KB_COACH_GUIDANCE',
    'SUBMIT_CREATE',
    'SUBMIT_UPDATE',
    'SUBMIT_DELETE',
    'NODE_CREATE',
    'NODE_RELATION_CREATE',
    'IDEA_WALL_MESSAGE_CREATE',
    'USER_VIEW_PROFILE',
    'STUDENT_VIEW_DASHBOARD',
    'TEACHER_VIEW_CLASS_LIST'
)
GROUP BY action
ORDER BY count DESC;

-- 2. 最新 20 筆學生功能 Audit Logs
SELECT 
    ae.id,
    ae.action,
    ae."targetType",
    ae."targetId",
    ae."projectId",
    TO_CHAR(ae."createdAt", 'YYYY-MM-DD HH24:MI:SS') as created,
    u.username as actor
FROM audit_events ae
LEFT JOIN users u ON ae."actorId" = u.id
WHERE ae.action IN (
    'AI_TASK_ASSISTANT_REQUEST',
    'KB_COACH_GUIDANCE',
    'SUBMIT_CREATE',
    'NODE_CREATE',
    'IDEA_WALL_MESSAGE_CREATE'
)
ORDER BY ae."createdAt" DESC
LIMIT 20;
