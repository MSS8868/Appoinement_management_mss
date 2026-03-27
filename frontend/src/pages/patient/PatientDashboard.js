import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { patientAPI, appointmentAPI } from '../../services/api';
import { MdCalendarToday, MdAddCircle, MdAccessTime, MdLocalHospital, MdNotifications } from 'react-icons/md';
import { format, isToday, isFuture, isPast, parseISO, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_META = {
  confirmed:   { cls: 'badge-primary', label: 'Confirmed' },
  visited:     { cls: 'badge-success', label: 'Visited'   },
  cancelled:   { cls: 'badge-danger',  label: 'Cancelled' },
  not_visited: { cls: 'badge-warning', label: 'Missed'    },
  referred:    { cls: 'badge-purple',  label: 'Referred'  },
};

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      patientAPI.getMe(),
      patientAPI.getFollowUps().catch(() => ({ data: { followUps: [] } })),
    ]).then(([profRes, fuRes]) => {
      setProfile(profRes.data.patient);
      setAppointments(profRes.data.appointments || []);
      setFollowUps(fuRes.data.followUps || []);
    }).catch(() => toast.error('Failed to load dashboard'))
    .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = appointments.filter(a =>
    a.status === 'confirmed' && a.appointmentDate >= today
  );
  const pendingFollowUps = followUps.filter(f => f.status === 'pending');

  if (loading) return (
    <div className="loading-center" style={{ minHeight: 300 }}>
      <div className="spinner" />
    </div>
  );

  if (!profile) return (
    <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>👋</div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, marginBottom: 8 }}>Welcome to MediCare!</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Complete your profile to start booking appointments.</p>
      <button className="btn btn-primary btn-lg" onClick={() => navigate('/complete-profile')}>Complete Profile →</button>
    </div>
  );

  return (
    <div className="fade-in">
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', color: 'white', fontSize: 26, marginBottom: 4 }}>
            Good day, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
            Patient ID: <strong style={{ color: 'white' }}>{profile?.patientId}</strong>
            {profile?.bloodGroup && (
              <span style={{ marginLeft: 16 }}>
                Blood Group: <strong style={{ color: 'white' }}>{profile.bloodGroup}</strong>
              </span>
            )}
          </p>
        </div>
        <button
          className="btn"
          onClick={() => navigate('/patient/book')}
          style={{ background: 'white', color: '#0D47A1', fontWeight: 600, padding: '12px 22px', borderRadius: 12 }}
        >
          <MdAddCircle size={18} /> Book Appointment
        </button>
      </div>

      {/* Pending Follow-up Alert */}
      {pendingFollowUps.length > 0 && (
        <div
          style={{ background: 'linear-gradient(135deg, #FFF8E1, #FFF3CD)', border: '1px solid #FFE082', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, cursor: 'pointer' }}
          onClick={() => navigate('/patient/follow-ups')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: 'var(--warning)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MdNotifications size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#7B5800' }}>
                {pendingFollowUps.length} Follow-up{pendingFollowUps.length > 1 ? 's' : ''} Waiting for Your Response
              </div>
              <div style={{ fontSize: 12, color: '#A07000' }}>
                {pendingFollowUps.map(f => f.doctor?.user?.name).join(', ')} recommended follow-up visits
              </div>
            </div>
          </div>
          <button className="btn btn-sm" style={{ background: 'var(--warning)', color: 'white', fontWeight: 600 }}>
            View & Respond →
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          {
            label: 'Total Visits', value: appointments.length,
            icon: '📅', color: '#E3F0FF',
            onClick: () => navigate('/patient/appointments'),
          },
          {
            label: 'Upcoming', value: upcoming.length,
            icon: '⏰', color: '#E8F5E9',
            onClick: () => navigate('/patient/appointments'),
          },
          {
            label: 'Completed', value: appointments.filter(a => a.status === 'visited').length,
            icon: '✅', color: '#F3E5F5',
          },
          {
            label: 'Follow-ups', value: followUps.length,
            icon: '🔄', color: pendingFollowUps.length > 0 ? '#FFF8E1' : '#F3E5F5',
            badge: pendingFollowUps.length > 0 ? pendingFollowUps.length : null,
            onClick: () => navigate('/patient/follow-ups'),
          },
        ].map(s => (
          <div
            key={s.label}
            className="stat-card"
            style={{ cursor: s.onClick ? 'pointer' : 'default', position: 'relative' }}
            onClick={s.onClick}
          >
            {s.badge && (
              <div style={{ position: 'absolute', top: 10, right: 10, background: 'var(--warning)', color: 'white', width: 20, height: 20, borderRadius: 10, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.badge}
              </div>
            )}
            <div className="stat-icon" style={{ background: s.color }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Upcoming Appointments */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdAccessTime size={18} color="var(--primary)" />
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Upcoming Appointments</h3>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/patient/appointments')}>
              View All
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 24px' }}>
              <MdCalendarToday size={40} color="var(--border)" />
              <h3 style={{ marginTop: 12 }}>No upcoming appointments</h3>
              <p>Book with one of our specialist doctors</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('/patient/book')}>
                Book Now
              </button>
            </div>
          ) : (
            upcoming.slice(0, 4).map(apt => (
              <div key={apt.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, background: 'var(--primary-50)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  🏥
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{apt.doctor?.user?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{apt.doctor?.department?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>📅 {format(parseISO(apt.appointmentDate), 'dd MMM yyyy')}</span>
                    <span>⏰ {apt.appointmentTime}</span>
                    <span>🎟️ #{apt.tokenNumber}</span>
                  </div>
                </div>
                {isToday(parseISO(apt.appointmentDate)) && (
                  <span className="badge badge-success" style={{ fontSize: 10 }}>Today</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Follow-ups pending */}
          {pendingFollowUps.length > 0 && (
            <div className="card" style={{ border: '2px solid var(--warning)' }}>
              <div className="card-header" style={{ background: 'var(--warning-light)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdNotifications /> Follow-ups Pending ({pendingFollowUps.length})
                </h3>
              </div>
              {pendingFollowUps.slice(0, 3).map(fu => {
                const daysUntil = differenceInDays(parseISO(fu.followUpDate), new Date());
                return (
                  <div key={fu.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{fu.doctor?.user?.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Recommended: {format(parseISO(fu.followUpDate), 'dd MMM yyyy')}
                      {daysUntil >= 0 && daysUntil <= 7 && (
                        <span style={{ color: 'var(--warning)', marginLeft: 8, fontWeight: 600 }}>
                          ({daysUntil === 0 ? 'Today' : `in ${daysUntil}d`})
                        </span>
                      )}
                    </div>
                    {fu.followUpNotes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{fu.followUpNotes}</div>}
                  </div>
                );
              })}
              <div style={{ padding: '10px 16px' }}>
                <button className="btn btn-sm btn-block" style={{ background: 'var(--warning)', color: 'white' }} onClick={() => navigate('/patient/follow-ups')}>
                  Respond to Follow-ups →
                </button>
              </div>
            </div>
          )}

          {/* Health Profile */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MdLocalHospital size={17} color="var(--primary)" /> Health Profile
              </h3>
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/patient/profile')}>Edit</button>
            </div>
            <div style={{ padding: '12px 20px' }}>
              {[
                { label: 'Blood Group',   value: profile.bloodGroup || 'Not set' },
                { label: 'Age',           value: profile.age ? `${profile.age} years` : 'Not set' },
                { label: 'Gender',        value: profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not set' },
                { label: 'Conditions',    value: profile.existingConditions || 'None' },
                { label: 'Emergency',     value: profile.emergencyContact || 'Not set' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%', fontSize: 13 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Book */}
          <div className="card">
            <div className="card-header"><h3 style={{ fontSize: 15, fontWeight: 600 }}>Quick Book by Specialty</h3></div>
            <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Orthopaedics','Cardiology','General Medicine','Paediatrics','ENT','Gynaecology','Dentistry','Ayurveda'].map(d => (
                <button key={d} className="btn btn-sm btn-outline" onClick={() => navigate('/patient/book')} style={{ fontSize: 12 }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent history */}
      {appointments.filter(a => a.status !== 'confirmed').length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Recent Visit History</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/patient/appointments')}>View All</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Appointment ID</th>
                  <th>Doctor</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.filter(a => a.status !== 'confirmed').slice(0, 5).map(apt => {
                  const meta = STATUS_META[apt.status] || { cls: 'badge-gray', label: apt.status };
                  return (
                    <tr key={apt.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)' }}>{apt.appointmentId}</td>
                      <td style={{ fontWeight: 500, fontSize: 14 }}>{apt.doctor?.user?.name}</td>
                      <td style={{ fontSize: 13 }}>{apt.doctor?.department?.name}</td>
                      <td style={{ fontSize: 13 }}>{format(parseISO(apt.appointmentDate), 'dd MMM yyyy')}</td>
                      <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
