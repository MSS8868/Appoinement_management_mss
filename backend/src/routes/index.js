const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const authCtrl        = require('../controllers/authController');
const appointmentCtrl = require('../controllers/appointmentController');
const consultCtrl     = require('../controllers/consultationController');
const doctorCtrl      = require('../controllers/doctorController');
const patientCtrl     = require('../controllers/patientController');

// ── AUTH ──────────────────────────────────────────────────────────────────────
router.post('/auth/send-otp',         authCtrl.sendOTP);
router.post('/auth/verify-otp',       authCtrl.verifyOTP);
router.post('/auth/login',            authCtrl.passwordLogin);
router.get ('/auth/me',               authenticate, authCtrl.getMe);
router.post('/auth/complete-profile', authenticate, authCtrl.completePatientProfile);

// ── DEPARTMENTS ───────────────────────────────────────────────────────────────
router.get('/departments', doctorCtrl.getDepartments);

// ── DOCTORS  (static paths BEFORE :id) ───────────────────────────────────────
router.get ('/doctors',             doctorCtrl.getDoctors);
router.get ('/doctors/me',          authenticate, authorize('doctor'), doctorCtrl.getMyProfile);
router.get ('/doctors/me/schedule', authenticate, authorize('doctor'), doctorCtrl.getMySchedule);
router.put ('/doctors/me/schedule', authenticate, authorize('doctor'), doctorCtrl.updateMySchedule);
router.get ('/doctors/:id',         doctorCtrl.getDoctor);
router.get ('/doctors/:id/schedule',doctorCtrl.getSchedule);
router.put ('/doctors/:id/schedule',authenticate, authorize('doctor', 'admin'), doctorCtrl.updateSchedule);
router.post('/doctors',             authenticate, authorize('admin'), doctorCtrl.createDoctor);

// ── APPOINTMENTS  (static paths BEFORE :id) ───────────────────────────────────
router.get ('/appointments/slots',    appointmentCtrl.getSlots);
router.get ('/appointments/queue',    authenticate, appointmentCtrl.getTodayQueue);
router.post('/appointments/lock-slot',authenticate, appointmentCtrl.lockSlot);
router.post('/appointments',          authenticate, appointmentCtrl.bookAppointment);
router.get ('/appointments',          authenticate, appointmentCtrl.getAppointments);
router.get ('/appointments/:id',      authenticate, appointmentCtrl.getById);
router.patch('/appointments/:id/status', authenticate, appointmentCtrl.updateStatus);
router.get ('/appointments/:id/pdf',  authenticate, appointmentCtrl.downloadPDF);

// ── CONSULTATIONS  (static ai/process BEFORE :appointmentId) ─────────────────
router.post('/consultations/ai/process',             authenticate, authorize('doctor'), consultCtrl.processAIInput);
router.get ('/consultations/:appointmentId',          authenticate, consultCtrl.getConsultation);
router.post('/consultations/:appointmentId',          authenticate, authorize('doctor'), consultCtrl.saveConsultation);
router.get ('/consultations/:appointmentId/prescription', authenticate, consultCtrl.downloadPrescription);

// ── PATIENTS  (static me/search/follow-ups BEFORE :id) ───────────────────────
router.get  ('/patients/me',              authenticate, authorize('patient'), patientCtrl.getMyProfile);
router.put  ('/patients/me',              authenticate, authorize('patient'), patientCtrl.updateProfile);
router.get  ('/patients/search',          authenticate, authorize('receptionist', 'admin', 'doctor'), patientCtrl.searchPatients);
router.get  ('/patients/follow-ups',      authenticate, authorize('patient'), patientCtrl.getMyFollowUps);
router.patch('/patients/follow-ups/:id',  authenticate, authorize('patient'), patientCtrl.respondToFollowUp);
router.get  ('/patients/:patientId/history', authenticate, consultCtrl.getPatientHistory);
router.get  ('/patients/:id',             authenticate, patientCtrl.getPatient);

// ── ADMIN ─────────────────────────────────────────────────────────────────────
router.get('/admin/analytics', authenticate, authorize('admin'), doctorCtrl.getAnalytics);

module.exports = router;
