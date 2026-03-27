import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, doctorAPI, appointmentAPI } from '../../services/api';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MdPeople, MdMedicalServices, MdCalendarToday, MdTrendingUp } from 'react-icons/md';

const COLORS = ['#0D47A1', '#00BFA5', '#E53935', '#FB8C00', '#7B1FA2', '#43A047'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [recentApts, setRecentApts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminAPI.getAnalytics(),
      doctorAPI.getAll(),
      appointmentAPI.getAll({ limit: 10 }),
    ]).then(([aRes, dRes, aptRes]) => {
      setAnalytics(aRes.data.analytics);
      setDoctors(dRes.data.doctors || []);
      setRecentApts(aptRes.data.appointments || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const stats = analytics || {};

  const pieData = [
    { name: 'Confirmed', value: stats.totalAppointments - stats.cancelledAppointments - (stats.todayAppointments || 0), color: '#0D47A1' },
    { name: 'Today', value: stats.todayAppointments || 0, color: '#00BFA5' },
    { name: 'Cancelled', value: stats.cancelledAppointments || 0, color: '#E53935' },
  ].filter(d => d.value > 0);

  // Dept breakdown from doctors
  const deptCounts = {};
  doctors.forEach(d => {
    const name = d.department?.name || 'Other';
    deptCounts[name] = (deptCounts[name] || 0) + 1;
  });
  const deptBarData = Object.entries(deptCounts).map(([name, count]) => ({ name: name.slice(0, 10), count })).sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #B71C1C, #E53935)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', color: 'white', fontSize: 24 }}>Admin Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{format(new Date(), 'EEEE, dd MMMM yyyy')} · MediCare Hospital</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" style={{ background: 'white', color: '#B71C1C', fontWeight: 600, fontSize: 13 }} onClick={() => navigate('/admin/doctors')}>
            <MdMedicalServices /> Manage Doctors
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Appointments', value: stats.totalAppointments || 0, icon: <MdCalendarToday size={22} />, color: '#E3F0FF', iconBg: 'var(--primary)' },
          { label: "Today's Appointments", value: stats.todayAppointments || 0, icon: <MdTrendingUp size={22} />, color: '#E8F5E9', iconBg: 'var(--success)' },
          { label: 'Total Patients', value: stats.totalPatients || 0, icon: <MdPeople size={22} />, color: '#F3E5F5', iconBg: 'var(--purple)' },
          { label: 'Cancellation Rate', value: `${stats.cancellationRate || 0}%`, icon: '📉', color: '#FFEBEE', iconBg: 'var(--danger)' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.color, color: s.iconBg }}>
              {typeof s.icon === 'string' ? <span style={{ fontSize: 20 }}>{s.icon}</span> : s.icon}
            </div>
            <div className="stat-content">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 24, alignItems: 'start' }}>
        {/* Bar Chart */}
        <div className="card">
          <div className="card-header"><h3 style={{ fontSize: 16, fontWeight: 600 }}>Doctors by Department</h3></div>
          <div style={{ padding: '16px 8px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptBarData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8FA3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8FA3B8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid var(--border)' }} />
                <Bar dataKey="count" fill="#0D47A1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <div className="card-header"><h3 style={{ fontSize: 16, fontWeight: 600 }}>Appointment Status</h3></div>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                      <span style={{ color: 'var(--text-muted)' }}>{d.name}: <strong style={{ color: 'var(--text-primary)' }}>{d.value}</strong></span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="empty-state"><p>No appointment data yet</p></div>}
          </div>
        </div>
      </div>

      {/* Quick Doctor List */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Active Doctors ({doctors.length})</h3>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/admin/doctors')}>Manage All</button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Doctor</th><th>Department</th><th>Specialization</th><th>Experience</th><th>Fee</th><th>Status</th></tr></thead>
            <tbody>
              {doctors.slice(0, 8).map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, background: 'var(--primary-50)', color: 'var(--primary)', flexShrink: 0 }}>
                        {doc.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{doc.user?.name}</div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{doc.department?.name}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{doc.specialization}</td>
                  <td style={{ fontSize: 13 }}>{doc.experience} yrs</td>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>₹{doc.consultationFee}</td>
                  <td><span className={`badge ${doc.isAvailable ? 'badge-success' : 'badge-danger'}`}>{doc.isAvailable ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="card">
        <div className="card-header"><h3 style={{ fontSize: 16, fontWeight: 600 }}>Recent Appointments</h3></div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {recentApts.map(apt => (
                <tr key={apt.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)' }}>{apt.appointmentId}</td>
                  <td style={{ fontSize: 14, fontWeight: 500 }}>{apt.patient?.user?.name}</td>
                  <td style={{ fontSize: 13 }}>{apt.doctor?.user?.name}</td>
                  <td style={{ fontSize: 13 }}>{apt.appointmentDate}</td>
                  <td style={{ fontSize: 13 }}>{apt.appointmentTime}</td>
                  <td><span className={`badge ${apt.status === 'visited' ? 'badge-success' : apt.status === 'cancelled' ? 'badge-danger' : 'badge-primary'}`} style={{ textTransform: 'capitalize', fontSize: 11 }}>{apt.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentApts.length === 0 && <div className="empty-state" style={{ padding: 32 }}><p>No appointments yet</p></div>}
        </div>
      </div>
    </div>
  );
}
