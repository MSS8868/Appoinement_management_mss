import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { patientAPI, deptAPI, doctorAPI, appointmentAPI, authAPI } from '../../services/api';
import { FiSearch } from 'react-icons/fi';
import { MdCheckCircle, MdArrowBack, MdArrowForward } from 'react-icons/md';
import { v4 as uuidv4 } from 'uuid';

const STEPS = ['Find / Register Patient', 'Select Doctor & Slot', 'Confirm Booking'];

export default function WalkInBooking() {
  const [step, setStep] = useState(0);
  const [searchMobile, setSearchMobile] = useState('');
  const [foundPatient, setFoundPatient] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', mobile: '', age: '', gender: '', bloodGroup: '', address: '' });
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);

  useEffect(() => { deptAPI.getAll().then(r => setDepartments(r.data.departments || [])); }, []);

  useEffect(() => {
    if (selectedDept) {
      doctorAPI.getAll({ departmentId: selectedDept.id, isAvailable: true })
        .then(r => setDoctors(r.data.doctors || []));
    }
  }, [selectedDept]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setSlotsLoading(true);
      appointmentAPI.getSlots(selectedDoctor.id, selectedDate)
        .then(r => setSlots(r.data.slots || []))
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false));
    }
  }, [selectedDoctor, selectedDate]);

  const handleSearch = async () => {
    if (!/^\d{10}$/.test(searchMobile)) return toast.error('Enter valid 10-digit mobile');
    setLoading(true);
    try {
      const res = await patientAPI.search({ mobile: searchMobile });
      if (res.data.patients?.length > 0) {
        setFoundPatient(res.data.patients[0]);
        setIsNew(false);
        toast.success('Patient found!');
      } else {
        setFoundPatient(null);
        setIsNew(true);
        setNewPatient(p => ({ ...p, mobile: searchMobile }));
        toast.info('New patient — fill registration details');
      }
    } catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const handleRegisterAndNext = async () => {
    if (!newPatient.name || !newPatient.gender) return toast.error('Name and gender are required');
    setLoading(true);
    try {
      // Send OTP then auto-verify in demo mode to create user
      const otpRes = await authAPI.sendOTP(newPatient.mobile);
      const demoOtp = otpRes.data?.demoOtp || '123456';

      const verRes = await authAPI.verifyOTP(newPatient.mobile, demoOtp);

      if (!verRes.data?.success) throw new Error('OTP verification failed');

      // Complete profile using patient token
      await authAPI.completeProfile(newPatient);

      // Now search for created patient
      const searchRes = await patientAPI.search({ mobile: newPatient.mobile });
      if (searchRes.data.patients?.length > 0) {
        setFoundPatient(searchRes.data.patients[0]);
        setIsNew(false);
      }
      toast.success('Patient registered successfully');
      setStep(1);
    } catch (err) {
      toast.error('Failed to register patient: ' + (err.message || ''));
    } finally { setLoading(false); }
  };

  const handleBook = async () => {
    if (!selectedSlot || !selectedDoctor || !foundPatient) return;
    setLoading(true);
    try {
      // Lock slot first
      await appointmentAPI.lockSlot(selectedSlot.id);
      const res = await appointmentAPI.book({
        slotId: selectedSlot.id,
        doctorId: selectedDoctor.id,
        patientId: foundPatient.id,
        bookedBy: 'receptionist',
        isEmergency,
        type: 'new',
      });
      setBookedAppointment(res.data.appointment);
      toast.success('Appointment booked!');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally { setLoading(false); }
  };

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i);
    return { val: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE'), date: format(d, 'd'), month: format(d, 'MMM') };
  });

  // SUCCESS
  if (step === 3 && bookedAppointment) {
    return (
      <div className="fade-in" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 64, height: 64, background: 'var(--success-light)', borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <MdCheckCircle size={36} color="var(--success)" />
          </div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, marginBottom: 6 }}>Booking Confirmed!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>Walk-in appointment booked by receptionist</p>
          <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 18, textAlign: 'left', marginBottom: 24 }}>
            {[
              ['Appointment ID', bookedAppointment.appointmentId],
              ['Token', `#${bookedAppointment.tokenNumber}`],
              ['Patient', bookedAppointment.patient?.user?.name || foundPatient?.user?.name],
              ['Doctor', bookedAppointment.doctor?.user?.name],
              ['Department', bookedAppointment.doctor?.department?.name],
              ['Date', bookedAppointment.appointmentDate],
              ['Time', bookedAppointment.appointmentTime],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setStep(0); setFoundPatient(null); setSelectedSlot(null); setSelectedDoctor(null); setSelectedDept(null); setBookedAppointment(null); setSearchMobile(''); }}>
              New Booking
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>Print Slip</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header"><h1>Walk-in Booking</h1><p>Book appointments for walk-in patients</p></div>

      {/* Stepper */}
      <div className="steps" style={{ marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className={`step-circle ${i < step ? 'done' : i === step ? 'active' : 'pending'}`}>{i < step ? '✓' : i + 1}</div>
              <div className="step-label" style={{ marginTop: 4, fontSize: 11 }}>{s}</div>
            </div>
            {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 0: Find Patient */}
      {step === 0 && (
        <div className="card fade-in">
          <div className="card-header"><h3 style={{ fontSize: 16, fontWeight: 600 }}>Find or Register Patient</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-control" style={{ paddingLeft: 36 }} type="tel" maxLength={10}
                  placeholder="Enter patient's 10-digit mobile number"
                  value={searchMobile} onChange={e => setSearchMobile(e.target.value.replace(/\D/, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              </div>
              <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>{loading ? '...' : 'Search'}</button>
            </div>

            {foundPatient && !isNew && (
              <div style={{ background: 'var(--success-light)', border: '1px solid var(--success)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--success)', marginBottom: 4 }}>✅ Patient Found</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{foundPatient.user?.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{foundPatient.user?.mobile} · {foundPatient.patientId} · Age: {foundPatient.age || '—'} · {foundPatient.gender}</div>
                {foundPatient.existingConditions && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Conditions: {foundPatient.existingConditions}</div>}
              </div>
            )}

            {isNew && (
              <div style={{ border: '1px solid var(--warning)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: 12 }}>⚠️ New Patient — Register Details</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Full Name</label>
                    <input className="form-control" value={newPatient.name} onChange={e => setNewPatient(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile</label>
                    <input className="form-control" value={newPatient.mobile} disabled />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input className="form-control" type="number" value={newPatient.age} onChange={e => setNewPatient(p => ({ ...p, age: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Gender</label>
                    <select className="form-control" value={newPatient.gender} onChange={e => setNewPatient(p => ({ ...p, gender: e.target.value }))}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Blood Group</label>
                    <select className="form-control" value={newPatient.bloodGroup} onChange={e => setNewPatient(p => ({ ...p, bloodGroup: e.target.value }))}>
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Address</label>
                    <input className="form-control" placeholder="City / Area" value={newPatient.address} onChange={e => setNewPatient(p => ({ ...p, address: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}

            {/* Emergency toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: isEmergency ? 'var(--danger-light)' : 'var(--bg)', borderRadius: 8, marginBottom: 16, cursor: 'pointer' }} onClick={() => setIsEmergency(e => !e)}>
              <input type="checkbox" checked={isEmergency} readOnly style={{ width: 16, height: 16, accentColor: 'var(--danger)' }} />
              <span style={{ fontSize: 14, fontWeight: isEmergency ? 600 : 400, color: isEmergency ? 'var(--danger)' : 'var(--text-secondary)' }}>🚨 Emergency Case (override queue)</span>
            </div>

            <button className="btn btn-primary btn-block"
              onClick={isNew ? handleRegisterAndNext : () => setStep(1)}
              disabled={loading || (!foundPatient && !isNew)}>
              {loading ? 'Processing...' : isNew ? 'Register & Continue →' : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Doctor & Slot */}
      {step === 1 && (
        <div className="card fade-in">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setStep(0)}><MdArrowBack /></button>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Select Doctor & Slot</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Department</label>
                <select className="form-control" value={selectedDept?.id || ''} onChange={e => { const d = departments.find(d => d.id === e.target.value); setSelectedDept(d); setSelectedDoctor(null); setSlots([]); }}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Doctor</label>
                <select className="form-control" value={selectedDoctor?.id || ''} onChange={e => { const d = doctors.find(d => d.id === e.target.value); setSelectedDoctor(d); setSelectedSlot(null); }} disabled={!selectedDept}>
                  <option value="">Select doctor</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.user?.name} — {d.specialization}</option>)}
                </select>
              </div>
            </div>

            {selectedDoctor && (
              <>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
                  {dates.map(d => (
                    <button key={d.val} onClick={() => { setSelectedDate(d.val); setSelectedSlot(null); }}
                      style={{ minWidth: 56, padding: '8px 6px', borderRadius: 10, border: `2px solid ${selectedDate === d.val ? 'var(--primary)' : 'var(--border)'}`, background: selectedDate === d.val ? 'var(--primary)' : 'white', color: selectedDate === d.val ? 'white' : 'var(--text-primary)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 500 }}>{d.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{d.date}</div>
                      <div style={{ fontSize: 10 }}>{d.month}</div>
                    </button>
                  ))}
                </div>
                {slotsLoading ? <div className="loading-center" style={{ minHeight: 80 }}><div className="spinner" /></div> : (
                  <>
                    <div className="slot-grid">
                      {slots.map(s => (
                        <button key={s.id} className={`slot-btn ${selectedSlot?.id === s.id ? 'selected' : ''}`} onClick={() => setSelectedSlot(s)}>{s.startTime}</button>
                      ))}
                    </div>
                    {slots.length === 0 && <div className="empty-state"><p>No available slots for this date</p></div>}
                  </>
                )}
              </>
            )}

            <button className="btn btn-primary btn-block" style={{ marginTop: 20 }}
              onClick={() => setStep(2)} disabled={!selectedSlot}>
              Confirm Slot <MdArrowForward />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Confirm */}
      {step === 2 && (
        <div className="card fade-in">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setStep(1)}><MdArrowBack /></button>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Confirm Walk-in Booking</h3>
            </div>
          </div>
          <div className="card-body">
            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              {[
                ['Patient', foundPatient?.user?.name],
                ['Patient ID', foundPatient?.patientId],
                ['Doctor', selectedDoctor?.user?.name],
                ['Specialization', selectedDoctor?.specialization],
                ['Department', selectedDept?.name],
                ['Date', selectedDate],
                ['Time', selectedSlot?.startTime],
                ['Fee', `₹${selectedDoctor?.consultationFee}`],
                ['Emergency', isEmergency ? '🚨 Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={handleBook} disabled={loading}>
              {loading ? 'Booking...' : '✅ Book Walk-in Appointment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
