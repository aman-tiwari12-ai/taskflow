const jwt = require('jsonwebtoken');
const db = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_dev_key_change_in_prod';

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.get('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireProjectAccess = (role = 'member') => async (req, res, next) => {
  const projectId = req.params.projectId || req.params.id;
  const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role === 'admin' || Number(project.owner_id) === req.user.id) {
    req.project = project; req.projectRole = 'admin'; return next();
  }
  const membership = await db.get('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, req.user.id]);
  if (!membership) return res.status(403).json({ error: 'Not a project member' });
  if (role === 'admin' && membership.role !== 'admin') return res.status(403).json({ error: 'Project admin access required' });
  req.project = project; req.projectRole = membership.role; next();
};

module.exports = { authenticate, requireProjectAccess, JWT_SECRET };
