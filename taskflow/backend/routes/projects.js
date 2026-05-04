const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../models/db');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      projects = await db.all(`SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
        FROM projects p JOIN users u ON p.owner_id = u.id ORDER BY p.created_at DESC`);
    } else {
      projects = await db.all(`SELECT DISTINCT p.*, u.name as owner_name, pm2.role as my_role,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm3 WHERE pm3.project_id = p.id) as member_count
        FROM projects p JOIN users u ON p.owner_id = u.id
        LEFT JOIN project_members pm2 ON pm2.project_id = p.id AND pm2.user_id = ?
        WHERE p.owner_id = ? OR pm2.user_id = ? ORDER BY p.created_at DESC`, [req.user.id, req.user.id, req.user.id]);
    }
    res.json({ projects });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticate, [body('name').trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, description } = req.body;
  try {
    const r = await db.run('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)', [name, description || null, req.user.id]);
    await db.run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [r.lastInsertRowid, req.user.id, 'admin']);
    const project = await db.get('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?', [r.lastInsertRowid]);
    res.status(201).json({ project });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', authenticate, requireProjectAccess(), async (req, res) => {
  const members = await db.all(`SELECT u.id, u.name, u.email, u.role as system_role, pm.role as project_role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = ?`, [req.params.id]);
  res.json({ project: req.project, members, myRole: req.projectRole });
});

router.put('/:id', authenticate, requireProjectAccess('admin'), async (req, res) => {
  const { name, description, status } = req.body;
  const fields = [], values = [];
  if (name) { fields.push('name = ?'); values.push(name); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (status) { fields.push('status = ?'); values.push(status); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);
  await db.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
  const project = await db.get('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?', [req.params.id]);
  res.json({ project });
});

router.delete('/:id', authenticate, requireProjectAccess('admin'), async (req, res) => {
  await db.run('DELETE FROM projects WHERE id = ?', [req.params.id]);
  res.json({ message: 'Project deleted' });
});

router.post('/:id/members', authenticate, requireProjectAccess('admin'), [body('user_id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { user_id, role = 'member' } = req.body;
  const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [user_id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const existing = await db.get('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.id, user_id]);
  if (existing) return res.status(409).json({ error: 'User already a member' });
  await db.run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [req.params.id, user_id, role]);
  res.status(201).json({ message: 'Member added', user, role });
});

router.delete('/:id/members/:userId', authenticate, requireProjectAccess('admin'), async (req, res) => {
  if (Number(req.params.userId) === Number(req.project.owner_id)) return res.status(400).json({ error: 'Cannot remove project owner' });
  await db.run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
  res.json({ message: 'Member removed' });
});

module.exports = router;
