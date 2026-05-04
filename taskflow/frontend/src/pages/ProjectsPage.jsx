import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const ProjectsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/projects').then(r => setProjects(r.data.projects)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const r = await api.post('/projects', form);
      setProjects(prev => [r.data.project, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '' });
      navigate(`/projects/${r.data.project.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally { setSaving(false); }
  };

  const getProgress = (p) => {
    if (!p.task_count) return 0;
    return Math.round((p.done_count / p.task_count) * 100);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📁</div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No projects yet</p>
          <p>Create your first project to get started</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
            + Create Project
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(p => {
            const progress = getProgress(p);
            return (
              <div key={p.id} className="card" style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                onClick={() => navigate(`/projects/${p.id}`)}>
                <div className="flex-between" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: `hsl(${hashColor(p.name)}, 60%, 35%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, color: 'white'
                    }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                      <div className="text-xs text-muted">by {p.owner_name}</div>
                    </div>
                  </div>
                  <span className={`badge badge-${p.status === 'active' ? 'in_progress' : 'todo'}`}>
                    {p.status}
                  </span>
                </div>

                {p.description && (
                  <p className="text-sm text-muted" style={{ marginBottom: 12, lineHeight: 1.5 }}>
                    {p.description.slice(0, 100)}{p.description.length > 100 ? '...' : ''}
                  </p>
                )}

                <div style={{ marginBottom: 10 }}>
                  <div className="flex-between text-xs text-muted" style={{ marginBottom: 5 }}>
                    <span>Progress</span>
                    <span>{progress}% ({p.done_count}/{p.task_count})</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${progress === 100 ? 'green' : ''}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="flex-between text-xs text-muted">
                  <span>👥 {p.member_count} member{p.member_count !== 1 ? 's' : ''}</span>
                  <span>📋 {p.task_count} task{p.task_count !== 1 ? 's' : ''}</span>
                  {p.my_role && <span className={`badge badge-${p.my_role}`} style={{ fontSize: 11 }}>{p.my_role}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Project</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input className="form-input" placeholder="e.g. Website Redesign"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" placeholder="What's this project about?"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              {error && <p className="error-msg">{error}</p>}
              <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const hashColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

export default ProjectsPage;
