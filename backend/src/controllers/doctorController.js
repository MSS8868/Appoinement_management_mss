const { Doctor, User, Department, DoctorSchedule, Appointment, Patient } = require('../models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// helper to build doctor includes
const doctorIncludes = (scheduleRequired = false) => [
  { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'email', 'profilePhoto'] },
  { model: Department, as: 'department' },
  { model: DoctorSchedule, as: 'schedules', required: scheduleRequired },
];

// ── Get all doctors ───────────────────────────────────────────────────────────
exports.getDoctors = async (req, res) => {
  try {
    const { departmentId, isAvailable } = req.query;
    const where = {};
    if (departmentId)            where.departmentId = departmentId;
    if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';

    const doctors = await Doctor.findAll({ where, include: doctorIncludes() });
    res.json({ success: true, doctors });
  } catch (err) {
    logger.error('getDoctors error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors: ' + err.message });
  }
};

// ── Get single doctor by id ───────────────────────────────────────────────────
exports.getDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, { include: doctorIncludes() });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, doctor });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctor: ' + err.message });
  }
};

// ── Get MY profile (logged-in doctor) ────────────────────────────────────────
exports.getMyProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      where: { userId: req.user.id },
      include: doctorIncludes(),
    });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found. Please contact admin.' });
    res.json({ success: true, doctor });
  } catch (err) {
    logger.error('getMyProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile: ' + err.message });
  }
};

// ── Get MY schedule (logged-in doctor) ────────────────────────────────────────
exports.getMySchedule = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    const schedules = await DoctorSchedule.findAll({ where: { doctorId: doctor.id }, order: [['dayOfWeek', 'ASC']] });
    res.json({ success: true, schedules, doctorId: doctor.id, slotDuration: doctor.slotDuration });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch schedule: ' + err.message });
  }
};

// ── Update MY schedule ────────────────────────────────────────────────────────
exports.updateMySchedule = async (req, res) => {
  try {
    const { schedules } = req.body;
    if (!Array.isArray(schedules)) return res.status(400).json({ success: false, message: 'schedules array required' });
    const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    await DoctorSchedule.destroy({ where: { doctorId: doctor.id } });
    const created = await DoctorSchedule.bulkCreate(
      schedules.map(s => ({ ...s, id: uuidv4(), doctorId: doctor.id }))
    );
    res.json({ success: true, message: 'Schedule updated', schedules: created });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update schedule: ' + err.message });
  }
};

// ── Get schedule by doctor id ─────────────────────────────────────────────────
exports.getSchedule = async (req, res) => {
  try {
    const schedules = await DoctorSchedule.findAll({ where: { doctorId: req.params.id }, order: [['dayOfWeek', 'ASC']] });
    res.json({ success: true, schedules });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch schedule: ' + err.message });
  }
};

// ── Update schedule by doctor id (admin) ──────────────────────────────────────
exports.updateSchedule = async (req, res) => {
  try {
    const { schedules } = req.body;
    const { id: doctorId } = req.params;
    await DoctorSchedule.destroy({ where: { doctorId } });
    const created = await DoctorSchedule.bulkCreate(schedules.map(s => ({ ...s, id: uuidv4(), doctorId })));
    res.json({ success: true, message: 'Schedule updated', schedules: created });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update schedule: ' + err.message });
  }
};

// ── Get departments ───────────────────────────────────────────────────────────
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
    res.json({ success: true, departments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments: ' + err.message });
  }
};

// ── Admin: create doctor ──────────────────────────────────────────────────────
exports.createDoctor = async (req, res) => {
  try {
    const { name, mobile, email, password = 'Doctor@123', departmentId, specialization, qualification, experience, bio, consultationFee, slotDuration } = req.body;
    if (!name || !mobile || !departmentId) return res.status(400).json({ success: false, message: 'Name, mobile and department required' });

    const existing = await User.findOne({ where: { mobile } });
    if (existing) return res.status(409).json({ success: false, message: 'Mobile already registered' });

    const user = await User.create({ id: uuidv4(), name, mobile, email, role: 'doctor', password, isActive: true });
    const doctor = await Doctor.create({
      id: uuidv4(), userId: user.id, departmentId,
      specialization: specialization || 'General', qualification: qualification || 'MBBS',
      experience: experience || 0, bio, consultationFee: consultationFee || 500,
      slotDuration: slotDuration || 15, isAvailable: true,
    });
    for (const day of [1, 2, 3, 4, 5, 6]) {
      await DoctorSchedule.create({ id: uuidv4(), doctorId: doctor.id, dayOfWeek: day, startTime: '09:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00', isActive: true, maxPatients: 20 });
    }
    const full = await Doctor.findByPk(doctor.id, { include: doctorIncludes() });
    res.status(201).json({ success: true, message: 'Doctor created', doctor: full });
  } catch (err) {
    logger.error('createDoctor error:', err);
    res.status(500).json({ success: false, message: 'Failed to create doctor: ' + err.message });
  }
};

// ── Admin: analytics ──────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [total, todayCount, cancelled, totalPatients, totalDoctors] = await Promise.all([
      Appointment.count(),
      Appointment.count({ where: { appointmentDate: today } }),
      Appointment.count({ where: { status: 'cancelled' } }),
      Patient.count(),
      Doctor.count(),
    ]);
    res.json({
      success: true,
      analytics: {
        totalAppointments: total,
        todayAppointments: todayCount,
        cancelledAppointments: cancelled,
        cancellationRate: total ? ((cancelled / total) * 100).toFixed(1) : 0,
        totalPatients,
        totalDoctors,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics: ' + err.message });
  }
};
