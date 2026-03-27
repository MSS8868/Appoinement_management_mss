import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { doctorAPI } from '../../services/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_DAY = (i) => ({
  dayOfWeek: i,
  startTime: '09:00',
  endTime: '17:00',
  breakStart: '13:00',
  breakEnd: '14:00',
  isActive: false,
  maxPatients: 20,
});

export default function DoctorSchedule() {
  const [schedules, setSchedules] = useState(DAYS.map((_, i) => DEFAULT_DAY(i)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Use the dedicated /doctors/me/schedule endpoint — no more fragile getAll lookup
        const [profRes, schedRes] = await Promise.all([
          doctorAPI.getMyProfile(),
          doctorAPI.getMySchedule(),
        ]);
        setDoctorInfo(profRes.data.doctor);
        const existing = schedRes.data.schedules || [];
        const merged = DAYS.map((_, i) => {
          const found = existing.find(s => s.dayOfWeek === i);
          if (found) return { ...found, isActive: found.isActive !== false };
          return DEFAULT_DAY(i);
        });
        setSchedules(merged);
      } catch (err) {
        toast.error('Failed to load schedule: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggle = (i) =>
    setSchedules(prev => prev.map((s, idx) => idx === i ? { ...s, isActive: !s.isActive } : s));
  const update = (i, k, v) =>
    setSchedules(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s));

  const handleSave = async () => {
    setSaving(true);
    try {
      const active = schedules.filter(s => s.isActive);
      if (active.length === 0) {
        toast.error('Please enable at least one working day');
        setSaving(false);
        return;
      }
      await doctorAPI.updateMySchedule(active);
      toast.success('Schedule updated successfully');
    } catch (err) {
      toast.error('Failed to save: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>Loading schedule...</p>
    </div>
  );

  const activeDays = schedules.filter(s => s.isActive).length;

  return (
    <div className="fade-in" style={{ maxWidth: 860 }}>
      <div className="page-header-row" style={{ marginBottom: 20 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>My Weekly Schedule</h1>
          <p>Configure your OPD availability — slot duration: {doctorInfo?.slotDuration || 15} minutes</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {activeDays > 0 && (
            <span className="badge badge-success" style={{ fontSize: 13, padding: '5px 12px' }}>
              {activeDays} day{activeDays !== 1 ? 's' : ''} active
            </span>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</>
            ) : '✅ Save Schedule'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>💡</span>
        <span>Slots are auto-generated based on your schedule. Each slot is <strong>{doctorInfo?.slotDuration || 15} minutes</strong>. Break time is excluded from slots.</span>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, width: 40 }}>ON</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, width: 120 }}>DAY</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>OPD HOURS</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>BREAK TIME</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>MAX PATIENTS</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>SLOTS (EST.)</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s, i) => {
                // Estimate slots
                const start = s.startTime ? parseInt(s.startTime.split(':')[0]) * 60 + parseInt(s.startTime.split(':')[1]) : 540;
                const end = s.endTime ? parseInt(s.endTime.split(':')[0]) * 60 + parseInt(s.endTime.split(':')[1]) : 1020;
                const bStart = s.breakStart ? parseInt(s.breakStart.split(':')[0]) * 60 + parseInt(s.breakStart.split(':')[1]) : null;
                const bEnd = s.breakEnd ? parseInt(s.breakEnd.split(':')[0]) * 60 + parseInt(s.breakEnd.split(':')[1]) : null;
                const breakMins = (bStart && bEnd) ? Math.max(0, bEnd - bStart) : 0;
                const totalMins = Math.max(0, end - start - breakMins);
                const estSlots = Math.floor(totalMins / (doctorInfo?.slotDuration || 15));

                return (
                  <tr key={i} style={{
                    borderBottom: '1px solid var(--border)',
                    background: s.isActive ? (i % 2 === 0 ? 'white' : '#FAFBFF') : 'var(--bg)',
                    opacity: s.isActive ? 1 : 0.55,
                    transition: 'all 0.2s',
                  }}>
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="checkbox"
                        checked={s.isActive}
                        onChange={() => toggle(i)}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: s.isActive ? 700 : 400, fontSize: 14, color: s.isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {DAYS[i]}
                      </span>
                      {i === 0 && <span style={{ fontSize: 10, color: 'var(--danger)', marginLeft: 6 }}>Sun</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="time"
                          className="form-control"
                          style={{ width: 110, padding: '6px 10px', fontSize: 13 }}
                          value={s.startTime || '09:00'}
                          onChange={e => update(i, 'startTime', e.target.value)}
                          disabled={!s.isActive}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>to</span>
                        <input
                          type="time"
                          className="form-control"
                          style={{ width: 110, padding: '6px 10px', fontSize: 13 }}
                          value={s.endTime || '17:00'}
                          onChange={e => update(i, 'endTime', e.target.value)}
                          disabled={!s.isActive}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="time"
                          className="form-control"
                          style={{ width: 100, padding: '6px 10px', fontSize: 13 }}
                          value={s.breakStart || '13:00'}
                          onChange={e => update(i, 'breakStart', e.target.value)}
                          disabled={!s.isActive}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>–</span>
                        <input
                          type="time"
                          className="form-control"
                          style={{ width: 100, padding: '6px 10px', fontSize: 13 }}
                          value={s.breakEnd || '14:00'}
                          onChange={e => update(i, 'breakEnd', e.target.value)}
                          disabled={!s.isActive}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: 80, padding: '6px 10px', fontSize: 13 }}
                        min="1" max="100"
                        value={s.maxPatients || 20}
                        onChange={e => update(i, 'maxPatients', parseInt(e.target.value))}
                        disabled={!s.isActive}
                      />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {s.isActive ? (
                        <span className="badge badge-accent" style={{ fontSize: 12 }}>~{estSlots} slots</span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Off</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '14px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 24 }}>
          <span>✅ <strong>{schedules.filter(s => s.isActive).length}</strong> working days</span>
          <span>🕐 <strong>{schedules.filter(s => s.isActive).reduce((acc, s) => {
            const start = s.startTime ? parseInt(s.startTime.split(':')[0]) * 60 + parseInt(s.startTime.split(':')[1]) : 540;
            const end = s.endTime ? parseInt(s.endTime.split(':')[0]) * 60 + parseInt(s.endTime.split(':')[1]) : 1020;
            const bStart = s.breakStart ? parseInt(s.breakStart.split(':')[0]) * 60 + parseInt(s.breakStart.split(':')[1]) : null;
            const bEnd = s.breakEnd ? parseInt(s.breakEnd.split(':')[0]) * 60 + parseInt(s.breakEnd.split(':')[1]) : null;
            const breakMins = (bStart && bEnd) ? Math.max(0, bEnd - bStart) : 0;
            return acc + Math.floor(Math.max(0, end - start - breakMins) / (doctorInfo?.slotDuration || 15));
          }, 0)}</strong> total weekly slots</span>
        </div>
      </div>
    </div>
  );
}
