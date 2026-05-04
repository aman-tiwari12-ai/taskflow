const router = require('express').Router();
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  const uid = req.user.id;
  const isAdmin = req.user.role === 'admin';
  try {
    const projectCount = isAdmin
      ? await db.get('SELECT COUNT(*) as count FROM projects')
      : await db.get(`SELECT COUNT(DISTINCT p.id) as count FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? WHERE p.owner_id = ? OR pm.user_id = ?`, [uid, uid, uid]);

    const myTasks = await db.all(`SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.assigned_to = ? AND t.status != 'done'
      ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END LIMIT 10`, [uid]);

    const overdueTasks = isAdmin
      ? await db.all(`SELECT t.*, p.name as project_name, u.name as assignee_name FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assigned_to = u.id WHERE t.due_date < date('now') AND t.status != 'done' ORDER BY t.due_date ASC LIMIT 10`)
      : await db.all(`SELECT t.*, p.name as project_name, u.name as assignee_name FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assigned_to = u.id WHERE t.due_date < date('now') AND t.status != 'done' AND (t.assigned_to = ? OR t.created_by = ?) ORDER BY t.due_date ASC LIMIT 10`, [uid, uid]);

    const statusCounts = isAdmin
      ? await db.all('SELECT status, COUNT(*) as count FROM tasks GROUP BY status')
      : await db.all(`SELECT t.status, COUNT(*) as count FROM tasks t JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ? GROUP BY t.status`, [uid]);

    const recentActivity = isAdmin
      ? await db.all(`SELECT t.*, p.name as project_name, u.name as assignee_name FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assigned_to = u.id ORDER BY t.updated_at DESC LIMIT 8`)
      : await db.all(`SELECT t.*, p.name as project_name, u.name as assignee_name FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assigned_to = u.id JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ? ORDER BY t.updated_at DESC LIMIT 8`, [uid]);

    res.json({ stats: { projects: projectCount.count, myTasks: myTasks.length, overdue: overdueTasks.length, statusCounts }, myTasks, overdueTasks, recentActivity });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
