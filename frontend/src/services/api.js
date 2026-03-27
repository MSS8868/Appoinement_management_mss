import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE, timeout: 30000 });

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
  }
  return Promise.reject(err);
});

export const authAPI = {
  sendOTP:          (mobile)         => api.post('/auth/send-otp', { mobile }),
  verifyOTP:        (mobile, otp)    => api.post('/auth/verify-otp', { mobile, otp }),
  login:            (mobile, password) => api.post('/auth/login', { mobile, password }),
  getMe:            ()               => api.get('/auth/me'),
  completeProfile:  (data)           => api.post('/auth/complete-profile', data),
};

export const deptAPI = {
  getAll: () => api.get('/departments'),
};

export const doctorAPI = {
  getAll:          (params) => api.get('/doctors', { params }),
  getById:         (id)     => api.get(`/doctors/${id}`),
  getMyProfile:    ()       => api.get('/doctors/me'),
  getMySchedule:   ()       => api.get('/doctors/me/schedule'),
  updateMySchedule:(scheds) => api.put('/doctors/me/schedule', { schedules: scheds }),
  getSchedule:     (id)     => api.get(`/doctors/${id}/schedule`),
  create:          (data)   => api.post('/doctors', data),
};

export const appointmentAPI = {
  getSlots:    (doctorId, date) => api.get('/appointments/slots', { params: { doctorId, date } }),
  lockSlot:    (slotId)         => api.post('/appointments/lock-slot', { slotId }),
  book:        (data)           => api.post('/appointments', data),
  getAll:      (params)         => api.get('/appointments', { params }),
  getQueue:    (params)         => api.get('/appointments/queue', { params }),
  getById:     (id)             => api.get(`/appointments/${id}`),
  updateStatus:(id, status, reason) => api.patch(`/appointments/${id}/status`, { status, cancelReason: reason }),
  downloadPDF: (id)             => api.get(`/appointments/${id}/pdf`, { responseType: 'blob' }),
};

export const consultationAPI = {
  get:               (aptId)         => api.get(`/consultations/${aptId}`),
  save:              (aptId, data)   => api.post(`/consultations/${aptId}`, data),
  processAI:         (text, patientId) => api.post('/consultations/ai/process', { text, patientId }),
  getPatientHistory: (patientId)     => api.get(`/patients/${patientId}/history`),
  downloadPrescription: (aptId)      => api.get(`/consultations/${aptId}/prescription`, { responseType: 'blob' }),
};

export const patientAPI = {
  getMe:            ()       => api.get('/patients/me'),
  update:           (data)   => api.put('/patients/me', data),
  search:           (params) => api.get('/patients/search', { params }),
  getById:          (id)     => api.get(`/patients/${id}`),
  getFollowUps:     ()       => api.get('/patients/follow-ups'),
  respondFollowUp:  (id, data) => api.patch(`/patients/follow-ups/${id}`, data),
};

export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
};

export function downloadBlob(res, filename) {
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
}

export default api;
