import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { appointmentAPI, consultationAPI, downloadBlob } from '../../services/api';
import { MdSend, MdAutoAwesome, MdAdd, MdDelete, MdDownload, MdSave, MdArrowBack, MdPerson } from 'react-icons/md';
import { FiMic, FiMicOff } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';

const EMPTY_MED  = { name: '', dosage: '', frequency: '', duration: '', instructions: '' };
const EMPTY_TEST = { name: '' };

const EMPTY_FORM = {
  chiefComplaint: '', symptoms: '', duration: '', diagnosis: '', clinicalNotes: '',
  medicines: [{ ...EMPTY_MED }],
  testsAdvised: [{ ...EMPTY_TEST }],
  vitals: { bp: '', pulse: '', temp: '', weight: '', height: '', spo2: '' },
  followUpDate: '', followUpNotes: '',
};

export default function ConsultationPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [patient, setPatient]         = useState(null);
  const [history, setHistory]         = useState([]);
  const [aiSummary, setAiSummary]     = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [aiText, setAiText]           = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [recording, setRecording]     = useState(false);
  const [saved, setSaved]             = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const recognitionRef                = useRef(null);

  const setF    = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setVital = (k, v) => setForm(p => ({ ...p, vitals: { ...p.vitals, [k]: v } }));

  // ── Load appointment + patient history + existing consultation ──
  useEffect(() => {
    const load = async () => {
      try {
        // Fetch the exact appointment
        const aptRes = await appointmentAPI.getById(appointmentId);
        const apt = aptRes.data.appointment;
        if (!apt) { toast.error('Appointment not found'); navigate('/doctor/queue'); return; }
        setAppointment(apt);

        // Patient history + AI summary
        const histRes = await consultationAPI.getPatientHistory(apt.patientId);
        setPatient(histRes.data.patient);
        setHistory(histRes.data.consultations || []);
        setAiSummary(histRes.data.aiSummary || '');

        // Existing consultation (if continuing)
        const consultRes = await consultationAPI.get(appointmentId);
        if (consultRes.data.consultation) {
          const c = consultRes.data.consultation;
          setForm({
            chiefComplaint: c.chiefComplaint || '',
            symptoms:       c.symptoms       || '',
            duration:       c.duration       || '',
            diagnosis:      c.diagnosis      || '',
            clinicalNotes:  c.clinicalNotes  || '',
            medicines:      c.medicines?.length  ? c.medicines  : [{ ...EMPTY_MED  }],
            testsAdvised:   c.testsAdvised?.length ? c.testsAdvised : [{ ...EMPTY_TEST }],
            vitals:         c.vitals || { bp: '', pulse: '', temp: '', weight: '', height: '', spo2: '' },
            followUpDate:   c.followUpDate   || '',
            followUpNotes:  c.followUpNotes  || '',
          });
        }
      } catch (err) {
        toast.error('Failed to load consultation: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [appointmentId]);

  // ── AI: process text input ──
  const handleAIProcess = async () => {
    if (!aiText.trim() || aiText.trim().length < 3) return toast.error('Please enter some symptoms or notes first');
    setAiProcessing(true);
    try {
      const res = await consultationAPI.processAI(aiText, appointment?.patientId);
      const d = res.data.data;
      setForm(prev => ({
        ...prev,
        chiefComplaint: d.chiefComplaint || prev.chiefComplaint,
        symptoms:       d.symptoms       || prev.symptoms,
        duration:       d.duration       || prev.duration,
        diagnosis:      d.diagnosis      || prev.diagnosis,
        clinicalNotes:  d.clinicalNotes  || prev.clinicalNotes,
        medicines:      d.medicines?.length  ? d.medicines  : prev.medicines,
        testsAdvised:   d.testsAdvised?.length ? d.testsAdvised : prev.testsAdvised,
        vitals:         { ...prev.vitals, ...d.vitals },
        followUpDate:   d.followUpDate   || prev.followUpDate,
        followUpNotes:  d.followUpNotes  || prev.followUpNotes,
      }));
      toast.success('✨ AI filled the form — please review and edit');
      setAiText('');
    } catch (err) {
      toast.error('AI processing failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setAiProcessing(false);
    }
  };

  // ── Voice input ──
  const toggleRecording = () => {
    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SRClass) return toast.error('Voice input not supported in this browser — use Chrome or Edge');

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const sr = new SRClass();
    sr.lang = 'en-IN';
    sr.continuous = true;
    sr.interimResults = true;
    sr.onresult = e => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setAiText(t);
    };
    sr.onerror = () => { setRecording(false); toast.error('Microphone error — check browser permissions'); };
    sr.onend   = () => setRecording(false);
    recognitionRef.current = sr;
    sr.start();
    setRecording(true);
    toast.success('🎤 Listening... speak your notes clearly');
  };

  // ── Save consultation ──
  const handleSave = async () => {
    setSaving(true);
    try {
      await consultationAPI.save(appointmentId, {
        ...form,
        medicines:    form.medicines.filter(m => m.name.trim()),
        testsAdvised: form.testsAdvised.filter(t => t.name.trim()),
      });
      setSaved(true);
      toast.success('Consultation saved successfully');
      if (form.followUpDate) {
        toast.success(`Follow-up reminder set for ${format(parseISO(form.followUpDate), 'dd MMM yyyy')} — patient will be notified`, { duration: 4000 });
      }
    } catch (err) {
      toast.error('Save failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ── Download prescription ──
  const handleDownloadPrescription = async () => {
    if (!saved && !appointment?.consultation) {
      toast.error('Please save the consultation first');
      return;
    }
    try {
      const res = await consultationAPI.downloadPrescription(appointmentId);
      downloadBlob(res, `prescription-${appointment?.appointmentId || appointmentId}.pdf`);
    } catch {
      toast.error('Failed to generate prescription — save consultation first');
    }
  };

  // ── Medicine helpers ──
  const addMed    = ()        => setForm(p => ({ ...p, medicines: [...p.medicines, { ...EMPTY_MED }] }));
  const updateMed = (i, k, v) => setForm(p => { const m = [...p.medicines]; m[i] = { ...m[i], [k]: v }; return { ...p, medicines: m }; });
  const removeMed = i         => setForm(p => ({ ...p, medicines: p.medicines.filter((_, x) => x !== i) }));

  const addTest    = ()      => setForm(p => ({ ...p, testsAdvised: [...p.testsAdvised, { ...EMPTY_TEST }] }));
  const updateTest = (i, v)  => setForm(p => { const t = [...p.testsAdvised]; t[i] = { name: v }; return { ...p, testsAdvised: t }; });
  const removeTest = i       => setForm(p => ({ ...p, testsAdvised: p.testsAdvised.filter((_, x) => x !== i) }));

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 10 }}>Loading consultation...</p>
    </div>
  );

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/doctor/queue')}><MdArrowBack /></button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22 }}>Consultation Notes</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {patient?.user?.name} &middot; {appointment?.appointmentDate} &middot; Token #{appointment?.tokenNumber}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={handleDownloadPrescription}>
            <MdDownload size={15} /> Prescription PDF
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <MdSave size={15} /> {saving ? 'Saving...' : saved ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      {saved && (
        <div style={{ background: 'var(--success-light)', border: '1px solid var(--success)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8 }}>
          ✅ Consultation saved — prescription available for download. Patient can view it in their portal.
          {form.followUpDate && <span style={{ marginLeft: 8, fontWeight: 600 }}>Follow-up set for {format(parseISO(form.followUpDate), 'dd MMM yyyy')} — patient notified.</span>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT: Patient sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Patient card */}
          {patient && (
            <div className="card">
              <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, var(--primary-50), #EEF5FF)', borderRadius: '12px 12px 0 0' }}>
                <div className="avatar" style={{ width: 44, height: 44, fontSize: 15, background: 'var(--primary)', color: 'white', marginBottom: 8 }}>
                  {patient.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{patient.user?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{patient.patientId}</div>
              </div>
              <div style={{ padding: '10px 14px' }}>
                {[
                  ['Age',        patient.age ? `${patient.age} yrs` : '—'],
                  ['Gender',     patient.gender || '—'],
                  ['Blood Grp',  patient.bloodGroup || '—'],
                  ['Mobile',     patient.user?.mobile],
                  ['Conditions', patient.existingConditions || 'None'],
                  ['Allergies',  patient.allergies || 'None'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight: 500, maxWidth: '55%', textAlign: 'right', fontSize: 12 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {aiSummary && (
            <div className="card" style={{ border: '1px solid var(--primary-100)' }}>
              <div style={{ padding: '10px 14px', background: 'var(--primary-50)', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdAutoAwesome size={14} color="var(--primary)" />
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--primary)' }}>AI Patient Summary</span>
              </div>
              <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{aiSummary}</div>
            </div>
          )}

          {/* Previous visits */}
          {history.length > 0 && (
            <div className="card">
              <div style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Previous Visits</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{history.length}</span>
              </div>
              {history.slice(0, 4).map(c => (
                <div key={c.id} style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.visitDate}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 1 }}>{c.diagnosis || c.chiefComplaint || 'No diagnosis recorded'}</div>
                  <div style={{ color: 'var(--primary)', fontSize: 11, marginTop: 1 }}>{c.appointment?.doctor?.user?.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Consultation form ── */}
        <div>

          {/* AI Assistant */}
          <div className="card" style={{ marginBottom: 14, border: '2px solid var(--primary-100)' }}>
            <div style={{ padding: '10px 16px', background: 'linear-gradient(to right, var(--primary-50), #EEF5FF)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdAutoAwesome color="var(--primary)" size={16} />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--primary)' }}>AI Assistant</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— type or speak patient notes, AI auto-fills the form below</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ background: 'white', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-end', gap: 10, transition: 'border-color 0.2s' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <textarea
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                  placeholder='e.g. "Patient has fever for 3 days, headache. Prescribe paracetamol 500mg TDS x 5 days. Advise CBC."'
                  style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: 14, resize: 'none', minHeight: 56, maxHeight: 130, lineHeight: 1.5, background: 'transparent' }}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleAIProcess(); } }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button
                    className={`btn btn-sm ${recording ? 'btn-danger' : 'btn-outline'}`}
                    onClick={toggleRecording}
                    title={recording ? 'Stop recording' : 'Start voice input'}
                    style={{ width: 36, height: 36, padding: 0 }}
                  >
                    {recording ? <FiMicOff size={14} /> : <FiMic size={14} />}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAIProcess}
                    disabled={aiProcessing || !aiText.trim()}
                    style={{ width: 36, height: 36, padding: 0 }}
                    title="Process with AI (Ctrl+Enter)"
                  >
                    {aiProcessing
                      ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                      : <MdSend size={14} />
                    }
                  </button>
                </div>
              </div>
              {recording && (
                <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ animation: 'pulse 1s infinite', display: 'inline-block', width: 8, height: 8, background: 'var(--danger)', borderRadius: '50%' }} />
                  Recording... Speak clearly. Press the mic button to stop.
                </p>
              )}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                Ctrl+Enter to process &nbsp;·&nbsp; Voice input works in Chrome &amp; Edge
              </p>
            </div>
          </div>

          {/* Vitals */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-header" style={{ padding: '12px 18px' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Vitals</h4>
            </div>
            <div style={{ padding: '10px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                {[
                  ['bp',     'BP (mmHg)',    '120/80'],
                  ['pulse',  'Pulse (bpm)',  '72'],
                  ['temp',   'Temp (°F)',    '98.6'],
                  ['weight', 'Weight (kg)',  '70'],
                  ['height', 'Height (cm)', '165'],
                  ['spo2',   'SpO₂ (%)',     '98'],
                ].map(([k, lbl, ph]) => (
                  <div key={k}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{lbl}</label>
                    <input className="form-control" style={{ padding: '7px 10px', fontSize: 14 }} placeholder={ph}
                      value={form.vitals[k] || ''} onChange={e => setVital(k, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Clinical details */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-header" style={{ padding: '12px 18px' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Clinical Details</h4>
            </div>
            <div style={{ padding: '10px 18px' }}>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Chief Complaint</label>
                  <input className="form-control" placeholder="Main reason for visit" value={form.chiefComplaint} onChange={e => setF('chiefComplaint', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Duration</label>
                  <input className="form-control" placeholder="e.g. 3 days" value={form.duration} onChange={e => setF('duration', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Symptoms</label>
                <textarea className="form-control" rows={2} placeholder="List all symptoms..." value={form.symptoms} onChange={e => setF('symptoms', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--primary)', fontWeight: 700 }}>Diagnosis / Impression</label>
                <input className="form-control" style={{ borderColor: 'var(--primary)', fontWeight: 500, fontSize: 15 }}
                  placeholder="Primary diagnosis..." value={form.diagnosis} onChange={e => setF('diagnosis', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Clinical Notes</label>
                <textarea className="form-control" rows={2} placeholder="Additional notes, observations, plan..." value={form.clinicalNotes} onChange={e => setF('clinicalNotes', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-header" style={{ padding: '12px 18px' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>℞ Prescription</h4>
              <button className="btn btn-sm btn-outline" onClick={addMed}><MdAdd size={14} /> Add Medicine</button>
            </div>
            <div style={{ padding: '8px 18px' }}>
              {form.medicines.map((med, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1.5fr auto', gap: 8, alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  {[
                    ['name',         'Medicine name',  '2fr'],
                    ['dosage',       'Dosage',         '1fr'],
                    ['frequency',    'Frequency',      '1.5fr'],
                    ['duration',     'Duration',       '1fr'],
                    ['instructions', 'Instructions',   '1.5fr'],
                  ].map(([key, ph]) => (
                    <input key={key} className="form-control" style={{ padding: '6px 9px', fontSize: 13 }}
                      placeholder={ph} value={med[key] || ''}
                      onChange={e => updateMed(i, key, e.target.value)} />
                  ))}
                  <button className="btn btn-ghost btn-icon" onClick={() => removeMed(i)} style={{ color: 'var(--danger)', padding: 4 }}>
                    <MdDelete size={15} />
                  </button>
                </div>
              ))}
              {form.medicines.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No medicines added yet</p>
              )}
            </div>
          </div>

          {/* Tests + Follow-up row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Tests */}
            <div className="card">
              <div className="card-header" style={{ padding: '12px 16px' }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tests Advised</h4>
                <button className="btn btn-sm btn-outline" onClick={addTest} style={{ padding: '4px 10px', fontSize: 12 }}><MdAdd size={13} /></button>
              </div>
              <div style={{ padding: '8px 16px' }}>
                {form.testsAdvised.map((test, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <input className="form-control" style={{ padding: '6px 9px', fontSize: 13 }}
                      placeholder={`Test ${i + 1} name`} value={test.name}
                      onChange={e => updateTest(i, e.target.value)} />
                    <button className="btn btn-ghost btn-icon" onClick={() => removeTest(i)} style={{ color: 'var(--danger)', padding: 3, flexShrink: 0 }}>
                      <MdDelete size={14} />
                    </button>
                  </div>
                ))}
                {form.testsAdvised.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>None added</p>}
              </div>
            </div>

            {/* Follow-up */}
            <div className="card">
              <div className="card-header" style={{ padding: '12px 16px' }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Follow-up</h4>
              </div>
              <div style={{ padding: '10px 16px' }}>
                <div className="form-group">
                  <label className="form-label">Recommended Date</label>
                  <input type="date" className="form-control" min={todayStr}
                    value={form.followUpDate} onChange={e => setF('followUpDate', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Instructions for patient</label>
                  <textarea className="form-control" rows={2}
                    placeholder="e.g. Review blood reports, check BP..."
                    value={form.followUpNotes} onChange={e => setF('followUpNotes', e.target.value)} />
                </div>
                {form.followUpDate && (
                  <div style={{ marginTop: 8, background: 'var(--success-light)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--success)' }}>
                    ✅ Patient will be notified about follow-up on {format(parseISO(form.followUpDate), 'dd MMM yyyy')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom save */}
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button className="btn btn-outline" onClick={handleDownloadPrescription} style={{ flex: 1 }}>
              <MdDownload size={15} /> Download Prescription
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
              <MdSave size={15} />
              {saving ? 'Saving...' : saved ? '✅ Update Consultation' : 'Save Consultation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
