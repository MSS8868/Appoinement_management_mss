import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { appointmentAPI } from '../../services/api';
import { MdRefresh, MdMedicalServices, MdPhone } from 'react-icons/md';

const STATUS_OPTIONS = [
  { val: 'visited',     label: '✅ Visited',     cls: 'badge-success' },
  { val: 'not_visited', label: '❌ Not Visited',  cls: 'badge-danger'  },
  { val: 'referred',    label: '🔄 Referred',    cls: 'badge-purple'  },
  { val: 'admitted',    label: '🏥 Admitted',    cls: 'badge-accent'  },
];

export default function DoctorQueue() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    appointmentAPI.getQueue()
      .then(r => setQueue(r.data.queue || []))
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const handleStatus = async (apt, status) => {
    setUpdatingId(apt.id);
    try {
      await appointmentAPI.updateStatus(apt.id, status);
      toast.success(`Marked as ${status.replace('_', ' ')}`);
      setQueue(q => q.map(a => a.id === apt.id ? { ...a, status } : a));
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const pending  = queue.filter(q => q.status === 'confirmed');
  const done     = queue.filter(q => q.status !== 'confirmed');
  const visited  = done.filter(q => q.status === 'visited').length;
  const notVisited = done.filter(q => q.status === 'not_visited').length;

  if (loading) return (
    <div className="loading-center" style={{ minHeight: 300 }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 10 }}>Loading queue...</p>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header-row">
        <div className="page-header">
          <h1>Today's Queue</h1>
          <p>{format(new Date(), 'EEEE, dd MMMM yyyy')} · {queue.length} total patients</p>
        </div>
        <button className="btn btn-outline" onClick={load}>
          <MdRefresh size={16} /> Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total',      value: queue.length, color: 'var(--primary-50)',   text: 'var(--primary)' },
          { label: 'Pending',    value: pending.length, color: 'var(--warning-light)', text: 'var(--warning)' },
          { label: 'Visited',    value: visited,      color: 'var(--success-light)', text: 'var(--success)' },
          { label: 'Missed',     value: notVisited,   color: 'var(--danger-light)',  text: 'var(--danger)'  },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color }}>
              <span style={{ fontSize: 18, color: s.text, fontWeight: 700 }}>{s.value}</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending patients */}
      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header" style={{ background: 'linear-gradient(to right, var(--warning-light), #FFFDE7)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#7B5800' }}>
              ⏳ Waiting — {pending.length} patient{pending.length > 1 ? 's' : ''}
            </h3>
          </div>
          {pending.map((apt, idx) => (
            <div key={apt.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              {/* Token */}
              <div className="token-badge" style={{
                background: idx === 0 ? 'var(--primary)' : 'var(--primary-50)',
                color: idx === 0 ? 'white' : 'var(--primary)',
                fontSize: 16, width: 44, height: 44,
              }}>
                #{apt.tokenNumber}
              </div>

              {/* Patient info */}
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{apt.patient?.user?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>⏰ {apt.appointmentTime}</span>
                  <span>{apt.type === 'new' ? '🆕 New' : '🔄 Follow-up'}</span>
                  {apt.patient?.user?.mobile && <span><MdPhone size={11} /> {apt.patient.user.mobile}</span>}
                </div>
              </div>

              {/* Current label */}
              {idx === 0 && (
                <span style={{ background: 'var(--primary)', color: 'white', fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
                  Current
                </span>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/doctor/consultation/${apt.id}`)}
                  disabled={updatingId === apt.id}
                >
                  <MdMedicalServices size={14} /> Open Consultation
                </button>
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.val}
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: 12, padding: '5px 10px' }}
                    disabled={updatingId === apt.id}
                    onClick={() => handleStatus(apt, s.val)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Done patients */}
      {done.length > 0 && (
        <div className="card">
          <div className="card-header" style={{ background: 'var(--success-light)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>
              ✅ Completed — {done.length} patient{done.length > 1 ? 's' : ''}
            </h3>
          </div>
          {done.map(apt => (
            <div key={apt.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, opacity: 0.8, flexWrap: 'wrap' }}>
              <div className="token-badge" style={{ background: 'var(--success-light)', color: 'var(--success)', width: 36, height: 36, fontSize: 13 }}>
                #{apt.tokenNumber}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{apt.patient?.user?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{apt.appointmentTime}</div>
              </div>
              <span className={`badge ${
                apt.status === 'visited'     ? 'badge-success' :
                apt.status === 'not_visited' ? 'badge-danger'  :
                apt.status === 'referred'    ? 'badge-purple'  : 'badge-accent'
              }`} style={{ textTransform: 'capitalize', fontSize: 11 }}>
                {apt.status.replace('_', ' ')}
              </span>
              {apt.status === 'visited' && (
                <button className="btn btn-sm btn-outline" style={{ fontSize: 12 }} onClick={() => navigate(`/doctor/consultation/${apt.id}`)}>
                  View Notes
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {queue.length === 0 && (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <h3>Queue is clear!</h3>
            <p>No patients scheduled for today</p>
          </div>
        </div>
      )}
    </div>
  );
}
