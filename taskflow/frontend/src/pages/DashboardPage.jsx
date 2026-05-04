import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { formatDate, isOverdue, isDueSoon, getPriorityColor } from '../utils';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const { stats, myTasks, overdueTasks, recentActivity } = data;
  const statusMap = {};
  stats.statusCounts.forEach(s => statusMap[s.status] = s.count);
  const totalTasks = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const doneCount = statusMap.done || 0;
  const progress = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {user.name.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening across your projects</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon="📁" label="Projects" value={stats.projects} color="var(--accent)" bg="var(--accent-glow)" />
        <StatCard icon="✅" label="My Open Tasks" value={stats.myTasks} color="var(--blue)" bg="var(--blue-dim)" />
        <StatCard icon="🔥" label="Overdue" value={stats.overdue} color="var(--red)" bg="var(--red-dim)" />
        <StatCard icon="🎯" label="Completion Rate" value={`${progress}%`} color="var(--green)" bg="var(--green-dim)" />
      </div>

      {/* Progress by status */}
      <div className="card mb-4" style={{marginBottom:20}}>
        <div className="flex-between mb-4" style={{marginBottom:12}}>
          <h3 style={{fontSize:15, fontWeight:700}}>Task Status Overview</h3>
          <span className="text-sm text-muted">{totalTasks} total tasks</span>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {[
            { key:'todo', label:'To Do', color:'var(--text-3)' },
            { key:'in_progress', label:'In Progress', color:'var(--blue)' },
            { key:'review', label:'Review', color:'var(--yellow)' },
            { key:'done', label:'Done', color:'var(--green)' },
          ].map(s => (
            <div key={s.key} style={{flex:'1 1 120px', background:'var(--surface-2)', borderRadius:10, padding:'14px 16px'}}>
              <div style={{fontSize:22, fontWeight:800, fontFamily:'Syne,sans-serif', color:s.color}}>{statusMap[s.key] || 0}</div>
              <div style={{fontSize:12, color:'var(--text-2)', marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{gap:20}}>
        {/* My Tasks */}
        <div>
          <div className="flex-between" style={{marginBottom:12}}>
            <h3 style={{fontSize:15, fontWeight:700}}>My Open Tasks</h3>
          </div>
          {myTasks.length === 0 ? (
            <div className="empty-state" style={{background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)'}}>
              <div className="icon">🎉</div>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {myTasks.slice(0,6).map(task => (
                <div key={task.id} className="task-card"
                  onClick={() => navigate(`/projects/${task.project_id}`)}>
                  <div className="flex-center gap-2" style={{marginBottom:6}}>
                    <span className={`priority-dot ${task.priority}`} />
                    <span className="task-title" style={{margin:0}}>{task.title}</span>
                  </div>
                  <div className="task-meta">
                    <span className={`badge badge-${task.status}`}>{task.status.replace('_',' ')}</span>
                    <span className="text-xs text-muted">📁 {task.project_name}</span>
                    {task.due_date && (
                      <span className={`text-xs ${isOverdue(task.due_date) ? 'overdue' : isDueSoon(task.due_date) ? 'due-soon' : 'text-muted'}`}>
                        📅 {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue + Recent */}
        <div>
          {overdueTasks.length > 0 && (
            <div style={{marginBottom:20}}>
              <h3 style={{fontSize:15, fontWeight:700, marginBottom:12, color:'var(--red)'}}>⚠ Overdue Tasks ({overdueTasks.length})</h3>
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {overdueTasks.slice(0,4).map(task => (
                  <div key={task.id} className="task-card" style={{borderColor:'rgba(239,68,68,0.25)'}}
                    onClick={() => navigate(`/projects/${task.project_id}`)}>
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className="text-xs text-muted">{task.project_name}</span>
                      <span className="text-xs overdue">Due {formatDate(task.due_date)}</span>
                      {task.assignee_name && <span className="text-xs text-muted">→ {task.assignee_name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 style={{fontSize:15, fontWeight:700, marginBottom:12}}>Recent Activity</h3>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {recentActivity.slice(0,5).map(task => (
              <div key={task.id} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'10px 14px', background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:10, cursor:'pointer'
              }} onClick={() => navigate(`/projects/${task.project_id}`)}>
                <span className={`badge badge-${task.status}`} style={{flexShrink:0}}>{task.status.replace('_',' ')}</span>
                <div style={{flex:1, minWidth:0}}>
                  <div className="truncate" style={{fontSize:13, fontWeight:600}}>{task.title}</div>
                  <div className="text-xs text-muted">{task.project_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, bg }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
    <div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export default DashboardPage;
