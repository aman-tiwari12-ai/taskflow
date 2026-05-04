import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils';

const AdminPage = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    Promise.all([
      api.get('/auth/users'),
      api.get('/projects'),
    ]).then(([u, p]) => {
      setUsers(u.data.users);
      setProjects(p.data.projects);
    }).finally(() => setLoading(false));
  }, [isAdmin, navigate]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage all users and projects</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-2)' }}>👥</div>
          <div><div className="stat-value">{users.length}</div><div className="stat-label">Total Users</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>📁</div>
          <div><div className="stat-value">{projects.length}</div><div className="stat-label">Total Projects</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>👑</div>
          <div><div className="stat-value">{users.filter(u => u.role === 'admin').length}</div><div className="stat-label">Admins</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)' }}>✅</div>
          <div><div className="stat-value">{projects.filter(p => p.status === 'active').length}</div><div className="stat-label">Active Projects</div></div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>All Users</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar sm">{u.name[0]}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                          <div className="text-xs text-dim">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td className="text-sm text-muted">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>All Projects</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr><th>Project</th><th>Owner</th><th>Tasks</th><th>Status</th></tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
                    <td style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</td>
                    <td className="text-sm text-muted">{p.owner_name}</td>
                    <td className="text-sm">{p.task_count || 0}</td>
                    <td><span className={`badge badge-${p.status === 'active' ? 'in_progress' : 'todo'}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
