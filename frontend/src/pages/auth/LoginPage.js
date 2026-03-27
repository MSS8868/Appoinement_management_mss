import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiPhone, FiLock, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import { MdLocalHospital } from 'react-icons/md';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ROLE_TABS = [
  { id: 'patient', label: 'Patient', icon: '🧑‍⚕️', method: 'otp' },
  { id: 'staff', label: 'Staff / Doctor', icon: '👨‍💼', method: 'password' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('patient');
  const [step, setStep] = useState(1); // 1=mobile, 2=otp
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) return toast.error('Enter valid 10-digit mobile number');
    setLoading(true);
    try {
      const res = await authAPI.sendOTP(mobile);
      if (res.data.demoOtp) setDemoOtp(res.data.demoOtp);
      toast.success(res.data.message);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(mobile, otp);
      const { token, user, needsProfile } = res.data;
      login(user, token);
      toast.success(`Welcome${user.name !== 'New Patient' ? ', ' + user.name : ''}!`);
      if (needsProfile) navigate('/complete-profile');
      else navigate('/patient');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) return toast.error('Enter valid 10-digit mobile number');
    if (!password) return toast.error('Password required');
    setLoading(true);
    try {
      const res = await authAPI.login(mobile, password);
      const { token, user } = res.data;
      login(user, token);
      toast.success(`Welcome, ${user.name}!`);
      const paths = { doctor: '/doctor', receptionist: '/receptionist', admin: '/admin' };
      navigate(paths[user.role] || '/patient');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.page}>
      {/* LEFT PANEL */}
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <div style={styles.logo}>
            <MdLocalHospital size={40} color="white" />
          </div>
          <h1 style={styles.brand}>MediCare</h1>
          <p style={styles.brandSub}>Multi-Specialty Hospital</p>
          <div style={styles.features}>
            {['Book appointments in under 30 seconds', 'Real-time slot availability', 'AI-powered consultation notes', 'Secure patient records'].map(f => (
              <div key={f} style={styles.feature}>
                <span style={styles.featureIcon}>✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
          <div style={styles.deptGrid}>
            {['Cardiology', 'Orthopaedics', 'Paediatrics', 'ENT', 'Radiology', 'Gynaecology'].map(d => (
              <div key={d} style={styles.deptTag}>{d}</div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={styles.right}>
        <div style={styles.loginBox}>
          <h2 style={styles.loginTitle}>Welcome Back</h2>
          <p style={styles.loginSub}>Sign in to your account</p>

          {/* Tab Switcher */}
          <div style={styles.tabs}>
            {ROLE_TABS.map(t => (
              <button key={t.id} style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
                onClick={() => { setTab(t.id); setStep(1); setMobile(''); setOtp(''); setPassword(''); }}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {/* PATIENT - OTP Flow */}
          {tab === 'patient' && (
            <div className="fade-in">
              {step === 1 ? (
                <form onSubmit={handleSendOTP}>
                  <div className="form-group">
                    <label className="form-label required">Mobile Number</label>
                    <div style={styles.inputWrap}>
                      <span style={styles.inputIcon}><FiPhone size={16} /></span>
                      <input className="form-control" style={{ paddingLeft: 40 }}
                        type="tel" placeholder="Enter 10-digit mobile number" maxLength={10}
                        value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                        required autoFocus />
                    </div>
                  </div>
                  <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
                    {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <>Get OTP <FiArrowRight /></>}
                  </button>
                  <p style={styles.hint}>OTP will be sent to your registered mobile number</p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP}>
                  <div style={styles.otpInfo}>
                    <span>OTP sent to <strong>+91 {mobile}</strong></span>
                    <button type="button" style={styles.changeBtn} onClick={() => { setStep(1); setOtp(''); }}>
                      <FiRefreshCw size={12} /> Change
                    </button>
                  </div>
                  {demoOtp && (
                    <div style={styles.demoBox}>
                      🧪 Demo OTP: <strong>{demoOtp}</strong>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label required">Enter OTP</label>
                    <input className="form-control" style={{ fontSize: 22, letterSpacing: 8, textAlign: 'center', fontWeight: 700 }}
                      type="tel" placeholder="••••••" maxLength={6}
                      value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      required autoFocus />
                  </div>
                  <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
                    {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Verify & Login'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STAFF - Password Flow */}
          {tab === 'staff' && (
            <form onSubmit={handlePasswordLogin} className="fade-in">
              <div className="form-group">
                <label className="form-label required">Mobile Number</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}><FiPhone size={16} /></span>
                  <input className="form-control" style={{ paddingLeft: 40 }}
                    type="tel" placeholder="Registered mobile number" maxLength={10}
                    value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                    required autoFocus />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label required">Password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}><FiLock size={16} /></span>
                  <input className="form-control" style={{ paddingLeft: 40 }}
                    type="password" placeholder="Enter password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    required />
                </div>
              </div>
              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <>Sign In <FiArrowRight /></>}
              </button>
              <div style={styles.demoBox}>
                <strong>Demo Credentials:</strong><br />
                Admin: 9999999999 / Admin@123<br />
                Receptionist: 9888888888 / Recep@123<br />
                Doctors: 9800000001–9800000016 / Doctor@123
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' },
  left: { flex: 1, background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 50%, #0A3880 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, position: 'relative', overflow: 'hidden' },
  leftContent: { position: 'relative', zIndex: 1, maxWidth: 420 },
  logo: { width: 72, height: 72, background: 'rgba(255,255,255,0.15)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, backdropFilter: 'blur(10px)' },
  brand: { fontFamily: 'Playfair Display, serif', fontSize: 42, fontWeight: 700, color: 'white', lineHeight: 1 },
  brandSub: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginTop: 8, marginBottom: 40 },
  features: { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 },
  feature: { display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.9)', fontSize: 15 },
  featureIcon: { width: 24, height: 24, background: 'rgba(255,255,255,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', flexShrink: 0, fontWeight: 700 },
  deptGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  deptTag: { padding: '5px 12px', background: 'rgba(255,255,255,0.12)', borderRadius: 20, color: 'rgba(255,255,255,0.8)', fontSize: 12, border: '1px solid rgba(255,255,255,0.2)' },
  right: { width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#F0F4F8' },
  loginBox: { width: '100%', background: 'white', borderRadius: 20, padding: 40, boxShadow: '0 8px 40px rgba(13,71,161,0.12)' },
  loginTitle: { fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: '#0F1C2E', marginBottom: 6 },
  loginSub: { color: '#8FA3B8', fontSize: 14, marginBottom: 28 },
  tabs: { display: 'flex', background: '#F0F4F8', borderRadius: 10, padding: 4, marginBottom: 28, gap: 4 },
  tab: { flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, color: '#8FA3B8', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' },
  tabActive: { background: 'white', color: '#0D47A1', boxShadow: '0 2px 8px rgba(13,71,161,0.12)' },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8FA3B8' },
  hint: { textAlign: 'center', color: '#8FA3B8', fontSize: 12, marginTop: 14 },
  otpInfo: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EEF5FF', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13 },
  changeBtn: { display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#0D47A1', cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  demoBox: { background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#7B5800', marginTop: 16, lineHeight: 1.8 },
};
