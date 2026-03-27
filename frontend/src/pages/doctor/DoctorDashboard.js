import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, doctorAPI } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { MdQueueMusic, MdAccessTime, MdMedicalServices, MdPerson } from 'react-icons/md';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    Promise.all([
      appointmentAPI.getQueue().catch(() => ({ data: { queue: [] } })),
      appointmentAPI.getAll({ status: 'confirmed', limit: 10 }).catch(() => ({ data: { appointments: [] } })),
      doctorAPI.getMyProfile().catch(() => ({ data: { doctor: null } })),
    ]).then(([qRes, uRes, dRes]) => {
      setQueue(qRes.data.queue || []);
      setUpcoming((uRes.data.appointments || []).filter(a => a.appointmentDate > today));
      setDoctorProfile(dRes.data.doctor);
    }).finally(() => setLoading(false));
  }, []);

  const visited  = queue.filter(q => q.status === 'visited').length;
  const pending  = queue.filter(q => q.status === 'confirmed').length;
  const referred = queue.filter(q => q.status === 'referred').length;

  if (loading) return (
    <div className="loading-center" style={{ minHeight: 300 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="fade-in">
      {/* Doctor welcome banner */}
      <div style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)', borderRadius: 16, padding: '22px 26px', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', color: 'white', fontSize: 24, marginBottom: 4 }}>
            Good day, {user?.name?.split(' ').slice(0, 2).join(' ')} 🩺
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
            {doctorProfile?.department?.name && (
              <span style={{ marginLeft: 14 }}>· {doctorProfile.department.name}</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => navigate('/doctor/queue')}>
            <MdQueueMusic size={16} /> Today's Queue
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {[
          { label: "Today's Patients", value: queue.length,  icon: '👥', color: '#E3F0FF', action: () => navigate('/doctor/queue') },
          { label: 'Pending',          value: pending,        icon: '⏳', color: '#FFF8E1'  },
          { label: 'Visited',          value: visited,        icon: '✅', color: '#E8F5E9'  },
          { label: 'Upcoming',         value: upcoming.length,icon: '📅', color: '#F3E5F5', action: () => {} },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ cursor: s.action ? 'pointer' : 'default' }} onClick={s.action}>
            <div className="stat-icon" style={{ background: s.color }}><span style={{ fontSize: 20 }}>{s.icon}</span></div>
            <div className="stat-content">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Today's queue preview */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdQueueMusic color="var(--primary)" size={17} /> Today's Queue
            </h3>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/doctor/queue')}>Full Queue</button>
          </div>
          {queue.length === 0 ? (
            <div className="empty-state" style={{ padding: '28px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
              <p>No patients scheduled today</p>
            </div>
          ) : (
            queue.slice(0, 6).map((apt, idx) => (
              <div key={apt.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="token-badge" style={{ background: idx === 0 && apt.status === 'confirmed' ? 'var(--primary)' : 'var(--primary-50)', color: idx === 0 && apt.status === 'confirmed' ? 'white' : 'var(--primary)', fontSize: 14 }}>
                  #{apt.tokenNumber}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{apt.patient?.user?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {apt.appointmentTime} &middot; {apt.type === 'new' ? 'New' : 'Follow-up'}
                  </div>
                </div>
                <span className={`badge ${apt.status === 'visited' ? 'badge-success' : apt.status === 'confirmed' ? 'badge-primary' : 'badge-gray'}`} style={{ fontSize: 11 }}>
                  {apt.status === 'visited' ? 'Done' : apt.status === 'confirmed' ? 'Pending' : apt.status}
                </span>
                {apt.status === 'confirmed' && (
                  <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => navigate(`/doctor/consultation/${apt.id}`)}>
                    <MdMedicalServices size={13} /> Consult
                  </button>
                )}
              </div>
            ))
          )}
          {queue.length > 6 && (
            <div style={{ padding: '10px 18px', textAlign: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/doctor/queue')}>View all {queue.length} patients →</button>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Upcoming appointments */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MdAccessTime color="var(--primary)" size={17} /> Upcoming
              </h3>
            </div>
            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                <p>No upcoming appointments</p>
              </div>
            ) : (
              upcoming.slice(0, 5).map(apt => (
                <div key={apt.id} style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, background: 'var(--purple-light)', color: 'var(--purple)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    #{apt.tokenNumber}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{apt.patient?.user?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {format(parseISO(apt.appointmentDate), 'dd MMM')} · {apt.appointmentTime}
                    </div>
                  </div>
                  <span className={`badge ${apt.type === 'new' ? 'badge-primary' : 'badge-accent'}`} style={{ fontSize: 10 }}>
                    {apt.type === 'new' ? 'New' : 'F/U'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Doctor profile card */}
          {doctorProfile && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdPerson color="var(--primary)" size={16} /> My Profile
                </h3>
                <button className="btn btn-sm btn-ghost" onClick={() => navigate('/doctor/schedule')}>Edit Schedule</button>
              </div>
              <div style={{ padding: '12px 16px' }}>
                {[
                  ['Department',  doctorProfile.department?.name],
                  ['Specialization', doctorProfile.specialization],
                  ['Experience',  `${doctorProfile.experience} years`],
                  ['Slot Duration', `${doctorProfile.slotDuration} minutes`],
                  ['Fee',         `₹${doctorProfile.consultationFee}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
