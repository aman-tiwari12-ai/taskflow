import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { formatDate, isOverdue, isDueSoon } from '../utils';

const STATUS_COLS = [
  { key: 'todo', label: 'To Do', color: 'var(--text-2)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
  { key: 'review', label: 'Review', color: 'var(--yellow)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const ProjectDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState('member');
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('kanban');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [taskDetail, setTaskDetail] = useState(null);
  const [toast, setToast] = useState(null);

  const isProjectAdmin = myRole === 'admin' || user.role === 'admin';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const [projRes, tasksRes, usersRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
        api.get('/auth/users'),
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setMyRole(projRes.data.myRole);
      setTasks(tasksRes.data.tasks);
      setAllUsers(usersRes.data.users);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/projects');
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    await api.delete(`/projects/${id}`);
    navigate('/projects');
  };

  const handleStatusChange = async (taskId, newStatus) => {
    await api.put(`/projects/${id}/tasks/${taskId}`, { status: newStatus });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    showToast('Status updated');
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await api.delete(`/projects/${id}/tasks/${taskId}`);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setTaskDetail(null);
    showToast('Task deleted');
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    await api.delete(`/projects/${id}/members/${userId}`);
    setMembers(prev => prev.filter(m => m.id !== userId));
    showToast('Member removed');
  };

  const grouped = STATUS_COLS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!project) return null;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>← Projects</button>
          <h1 className="page-title">{project.name}</h1>
          <span className={`badge badge-${project.status === 'active' ? 'in_progress' : 'todo'}`}>{project.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowMembers(true)}>👥 {members.length}</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditTask(null); setShowTaskModal(true); }}>+ Task</button>
          {isProjectAdmin && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>🗑</button>
          )}
        </div>
      </div>

      {project.description && <p className="text-muted" style={{ marginBottom: 12, fontSize: 14 }}>{project.description}</p>}

      {/* Progress */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="progress-bar" style={{ flex: 1 }}>
          <div className={`progress-fill ${progress === 100 ? 'green' : ''}`} style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm text-muted">{progress}% complete ({doneTasks}/{totalTasks})</span>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['kanban', 'list'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'kanban' ? '📋 Board' : '📃 List'}
          </button>
        ))}
      </div>

      {/* Kanban View */}
      {tab === 'kanban' && (
        <div className="kanban-board">
          {STATUS_COLS.map(col => (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-col-title" style={{ color: col.color }}>{col.label}</span>
                <span className="kanban-count">{grouped[col.key].length}</span>
              </div>
              <div className="kanban-tasks">
                {grouped[col.key].map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => setTaskDetail(task)}
                    onStatusChange={handleStatusChange} isAdmin={isProjectAdmin} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {tab === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {tasks.length === 0 ? (
            <div className="empty-state"><div className="icon">📋</div><p>No tasks yet</p></div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due</th><th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => setTaskDetail(task)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                      {task.description && <div className="text-xs text-muted">{task.description.slice(0, 60)}...</div>}
                    </td>
                    <td><span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span></td>
                    <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td>{task.assignee_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="avatar sm">{task.assignee_name[0]}</div>
                        <span className="text-sm">{task.assignee_name}</span>
                      </div>
                    ) : <span className="text-dim">—</span>}</td>
                    <td>
                      {task.due_date ? (
                        <span className={`text-sm ${isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : isDueSoon(task.due_date) ? 'due-soon' : 'text-muted'}`}>
                          {formatDate(task.due_date)}
                        </span>
                      ) : <span className="text-dim">—</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-xs" onClick={() => { setEditTask(task); setShowTaskModal(true); }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskModal && (
        <TaskFormModal
          task={editTask}
          projectId={id}
          members={members}
          onClose={() => setShowTaskModal(false)}
          onSave={(task, isEdit) => {
            if (isEdit) setTasks(prev => prev.map(t => t.id === task.id ? task : t));
            else setTasks(prev => [task, ...prev]);
            setShowTaskModal(false);
            showToast(isEdit ? 'Task updated' : 'Task created');
          }}
        />
      )}

      {/* Task Detail Modal */}
      {taskDetail && (
        <TaskDetailModal
          task={taskDetail}
          projectId={id}
          members={members}
          isAdmin={isProjectAdmin}
          currentUser={user}
          onClose={() => setTaskDetail(null)}
          onEdit={() => { setEditTask(taskDetail); setTaskDetail(null); setShowTaskModal(true); }}
          onDelete={() => handleDeleteTask(taskDetail.id)}
          onStatusChange={(status) => { handleStatusChange(taskDetail.id, status); setTaskDetail(prev => ({ ...prev, status })); }}
        />
      )}

      {/* Members Modal */}
      {showMembers && (
        <MembersModal
          members={members}
          allUsers={allUsers}
          projectId={id}
          isAdmin={isProjectAdmin}
          onClose={() => setShowMembers(false)}
          onAdd={(m) => { setMembers(prev => [...prev, m]); showToast('Member added'); }}
          onRemove={handleRemoveMember}
        />
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
    </div>
  );
};

/* ── Task Card ── */
const TaskCard = ({ task, onClick, onStatusChange, isAdmin }) => {
  const nextStatus = { todo: 'in_progress', in_progress: 'review', review: 'done', done: 'todo' };
  return (
    <div className="task-card" onClick={onClick}>
      <div className="flex-center gap-2" style={{ marginBottom: 6 }}>
        <span className={`priority-dot ${task.priority}`} />
        <span className="task-title" style={{ margin: 0, flex: 1 }}>{task.title}</span>
      </div>
      {task.due_date && (
        <div className={`text-xs ${isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : 'text-muted'}`} style={{ marginBottom: 6 }}>
          📅 {formatDate(task.due_date)}
        </div>
      )}
      <div className="flex-between">
        {task.assignee_name ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div className="avatar sm">{task.assignee_name[0]}</div>
            <span className="text-xs text-muted">{task.assignee_name}</span>
          </div>
        ) : <span />}
        <button className="btn btn-ghost btn-xs" onClick={e => { e.stopPropagation(); onStatusChange(task.id, nextStatus[task.status]); }}>
          →
        </button>
      </div>
    </div>
  );
};

/* ── Task Form Modal ── */
const TaskFormModal = ({ task, projectId, members, onClose, onSave }) => {
  const { user } = useAuth();
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assigned_to: task?.assigned_to || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    const payload = { ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null };
    try {
      let r;
      if (isEdit) r = await api.put(`/projects/${projectId}/tasks/${task.id}`, payload);
      else r = await api.post(`/projects/${projectId}/tasks`, payload);
      onSave(r.data.task, isEdit);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save task');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="Task title"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" placeholder="Details..."
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Assign To</label>
              <select className="form-input" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date"
                value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Task Detail Modal ── */
const TaskDetailModal = ({ task, projectId, members, isAdmin, currentUser, onClose, onEdit, onDelete, onStatusChange }) => {
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api.get(`/projects/${projectId}/tasks/${task.id}`).then(r => setComments(r.data.comments));
  }, [task.id, projectId]);

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    const r = await api.post(`/projects/${projectId}/tasks/${task.id}/comments`, { content: comment });
    setComments(prev => [...prev, r.data.comment]);
    setComment('');
    setPosting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <div className="flex-center gap-2" style={{ marginBottom: 6 }}>
              <span className={`priority-dot ${task.priority}`} />
              <span className={`badge badge-${task.priority}`}>{task.priority}</span>
              <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
            </div>
            <h2 className="modal-title">{task.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
            {(isAdmin || task.created_by === currentUser.id) && (
              <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {task.description && (
          <p className="text-sm" style={{ marginBottom: 16, color: 'var(--text-2)', lineHeight: 1.6 }}>{task.description}</p>
        )}

        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div>
            <div className="text-xs text-dim" style={{ marginBottom: 4 }}>ASSIGNEE</div>
            {task.assignee_name ? (
              <div className="flex-center gap-2">
                <div className="avatar sm">{task.assignee_name[0]}</div>
                <span className="text-sm">{task.assignee_name}</span>
              </div>
            ) : <span className="text-sm text-dim">Unassigned</span>}
          </div>
          <div>
            <div className="text-xs text-dim" style={{ marginBottom: 4 }}>DUE DATE</div>
            {task.due_date ? (
              <span className={`text-sm ${isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : 'text-muted'}`}>
                {formatDate(task.due_date)}
              </span>
            ) : <span className="text-sm text-dim">No due date</span>}
          </div>
        </div>

        {/* Status changer */}
        <div style={{ marginBottom: 20 }}>
          <div className="text-xs text-dim" style={{ marginBottom: 8 }}>MOVE TO</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['todo', 'in_progress', 'review', 'done'].filter(s => s !== task.status).map(s => (
              <button key={s} className="btn btn-ghost btn-sm" onClick={() => onStatusChange(s)}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div>
          <div className="text-xs text-dim" style={{ marginBottom: 10 }}>COMMENTS ({comments.length})</div>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
            {comments.length === 0 ? (
              <p className="text-sm text-dim">No comments yet</p>
            ) : comments.map(c => (
              <div key={c.id} style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="flex-between text-xs text-dim" style={{ marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{c.user_name}</span>
                  <span>{formatDate(c.created_at)}</span>
                </div>
                <p className="text-sm">{c.content}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" placeholder="Add a comment..." value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()} />
            <button className="btn btn-primary btn-sm" onClick={postComment} disabled={posting || !comment.trim()}>
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Members Modal ── */
const MembersModal = ({ members, allUsers, projectId, isAdmin, onClose, onAdd, onRemove }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState('member');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const memberIds = new Set(members.map(m => m.id));
  const nonMembers = allUsers.filter(u => !memberIds.has(u.id));

  const handleAdd = async () => {
    if (!selectedUser) return;
    setAdding(true); setError('');
    try {
      const r = await api.post(`/projects/${projectId}/members`, { user_id: parseInt(selectedUser), role });
      onAdd({ id: parseInt(selectedUser), name: r.data.user.name, email: r.data.user.email, project_role: role });
      setSelectedUser(''); setRole('member');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally { setAdding(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Team Members ({members.length})</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          {members.map(m => (
            <div key={m.id} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="flex-center gap-2">
                <div className="avatar sm">{m.name[0]}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                  <div className="text-xs text-dim">{m.email}</div>
                </div>
              </div>
              <div className="flex-center gap-2">
                <span className={`badge badge-${m.project_role}`}>{m.project_role}</span>
                {isAdmin && (
                  <button className="btn btn-ghost btn-xs" onClick={() => onRemove(m.id)}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {isAdmin && nonMembers.length > 0 && (
          <div>
            <div className="text-xs text-dim" style={{ marginBottom: 8 }}>ADD MEMBER</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-input" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ flex: 2 }}>
                <option value="">Select user...</option>
                {nonMembers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value)} style={{ flex: 1 }}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding || !selectedUser}>
                Add
              </button>
            </div>
            {error && <p className="error-msg">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage;
