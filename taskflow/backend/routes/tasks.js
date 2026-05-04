const router = require('express').Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const db = require('../models/db');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const TASK_SELECT = `SELECT t.*, u.name as assignee_name, u.email as assignee_email, c.name as creator_name
  FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id LEFT JOIN users c ON t.created_by = c.id`;

router.get('/', authenticate, requireProjectAccess(), async (req, res) => {
  const { status, priority, assigned_to } = req.query;
  let sql = `${TASK_SELECT} WHERE t.project_id = ?`;
  const args = [req.params.projectId];
  if (status) { sql += ' AND t.status = ?'; args.push(status); }
  if (priority) { sql += ' AND t.priority = ?'; args.push(priority); }
  if (assigned_to) { sql += ' AND t.assigned_to = ?'; args.push(assigned_to); }
  sql += ` ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.due_date ASC, t.created_at DESC`;
  const tasks = await db.all(sql, args);
  res.json({ tasks });
});

router.post('/', authenticate, requireProjectAccess(), [
  body('title').trim().notEmpty(),
  body('status').optional().isIn(['todo','in_progress','review','done']),
  body('priority').optional().isIn(['low','medium','high','urgent']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { title, description, assigned_to, status='todo', priority='medium', due_date } = req.body;
  if (assigned_to) {
    const member = await db.get('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.projectId, assigned_to]);
    if (!member) return res.status(400).json({ error: 'Assignee must be a project member' });
  }
  try {
    const r = await db.run(
      `INSERT INTO tasks (title, description, project_id, assigned_to, created_by, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description||null, req.params.projectId, assigned_to||null, req.user.id, status, priority, due_date||null]
    );
    const task = await db.get(`${TASK_SELECT} WHERE t.id = ?`, [r.lastInsertRowid]);
    res.status(201).json({ task });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', authenticate, requireProjectAccess(), async (req, res) => {
  const task = await db.get(`${TASK_SELECT} WHERE t.id = ? AND t.project_id = ?`, [req.params.id, req.params.projectId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const comments = await db.all(`SELECT cm.*, u.name as user_name FROM comments cm JOIN users u ON cm.user_id = u.id WHERE cm.task_id = ? ORDER BY cm.created_at ASC`, [req.params.id]);
  res.json({ task, comments });
});

router.put('/:id', authenticate, requireProjectAccess(), async (req, res) => {
  const task = await db.get('SELECT * FROM tasks WHERE id = ? AND project_id = ?', [req.params.id, req.params.projectId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.projectRole !== 'admin' && req.user.role !== 'admin' && Number(task.created_by) !== req.user.id && Number(task.assigned_to) !== req.user.id)
    return res.status(403).json({ error: 'Cannot modify this task' });
  const { title, description, assigned_to, status, priority, due_date } = req.body;
  const fields = ["updated_at = datetime('now')"], values = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (assigned_to !== undefined) { fields.push('assigned_to = ?'); values.push(assigned_to); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
  if (due_date !== undefined) { fields.push('due_date = ?'); values.push(due_date); }
  values.push(req.params.id);
  await db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
  const updated = await db.get(`${TASK_SELECT} WHERE t.id = ?`, [req.params.id]);
  res.json({ task: updated });
});

router.delete('/:id', authenticate, requireProjectAccess(), async (req, res) => {
  const task = await db.get('SELECT * FROM tasks WHERE id = ? AND project_id = ?', [req.params.id, req.params.projectId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.projectRole !== 'admin' && req.user.role !== 'admin' && Number(task.created_by) !== req.user.id)
    return res.status(403).json({ error: 'Cannot delete this task' });
  await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ message: 'Task deleted' });
});

router.post('/:id/comments', authenticate, requireProjectAccess(), [body('content').trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const task = await db.get('SELECT id FROM tasks WHERE id = ? AND project_id = ?', [req.params.id, req.params.projectId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const r = await db.run('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)', [req.params.id, req.user.id, req.body.content]);
  const comment = await db.get('SELECT cm.*, u.name as user_name FROM comments cm JOIN users u ON cm.user_id = u.id WHERE cm.id = ?', [r.lastInsertRowid]);
  res.status(201).json({ comment });
});

module.exports = router;
