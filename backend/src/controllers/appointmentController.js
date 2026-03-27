const { Op } = require('sequelize');
const { Appointment, Patient, Doctor, Department, Slot, User } = require('../models');
const { lockSlot: lockSlotFn, getAvailableSlots } = require('../utils/slotEngine');
const { generateAppointmentPDF } = require('../services/pdfService');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

function makeAppointmentId() {
  const d = new Date();
  const dt = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `APT-${dt}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// shared include for appointment queries
const aptIncludes = [
  { model: Patient, as: 'patient', include: [{ model: User, as: 'user', attributes: ['id','name','mobile','email'] }] },
  { model: Doctor,  as: 'doctor',  include: [{ model: User, as: 'user', attributes: ['id','name'] }, { model: Department, as: 'department' }] },
  { model: Slot,    as: 'slot' },
];

// ── Available slots ───────────────────────────────────────────────────────────
exports.getSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return res.status(400).json({ success: false, message: 'doctorId and date required' });
    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    const slots = await getAvailableSlots(doctorId, date, doctor);
    res.json({ success: true, slots });
  } catch (err) {
    logger.error('getSlots error:', err);
    res.status(500).json({ success: false, message: 'Failed to get slots: ' + err.message });
  }
};

// ── Lock slot ─────────────────────────────────────────────────────────────────
exports.lockSlot = async (req, res) => {
  try {
    const { slotId } = req.body;
    const slot = await lockSlotFn(slotId, req.user.id);
    if (!slot) return res.status(409).json({ success: false, message: 'Slot not available' });
    res.json({ success: true, slot, message: 'Slot locked for 3 minutes' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to lock slot: ' + err.message });
  }
};

// ── Book appointment ──────────────────────────────────────────────────────────
exports.bookAppointment = async (req, res) => {
  try {
    const { slotId, doctorId, patientId: bodyPatientId, type, notes, isEmergency, bookedBy } = req.body;

    let patient;
    if (bodyPatientId) {
      patient = await Patient.findByPk(bodyPatientId);
    } else {
      patient = await Patient.findOne({ where: { userId: req.user.id } });
    }
    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found. Please complete your profile first.' });

    const slot = await Slot.findByPk(slotId);
    if (!slot || !['available', 'locked'].includes(slot.status)) {
      return res.status(409).json({ success: false, message: 'Slot is no longer available' });
    }
    if (slot.status === 'locked' && slot.lockedBy !== req.user.id) {
      return res.status(409).json({ success: false, message: 'Slot is held by another user' });
    }

    const doctor = await Doctor.findByPk(doctorId, { include: [{ model: Department, as: 'department' }] });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    // Duplicate check
    const dup = await Appointment.findOne({
      where: { patientId: patient.id, doctorId, appointmentDate: slot.date, status: { [Op.notIn]: ['cancelled'] } },
    });
    if (dup) return res.status(409).json({ success: false, message: 'Appointment already exists for this doctor on this date' });

    const apt = await Appointment.create({
      id: uuidv4(), appointmentId: makeAppointmentId(),
      patientId: patient.id, doctorId, slotId,
      departmentId: doctor.departmentId,
      appointmentDate: slot.date, appointmentTime: slot.startTime,
      tokenNumber: slot.tokenNumber,
      status: 'confirmed', type: type || 'new',
      notes, bookedBy: bookedBy || 'patient', isEmergency: isEmergency || false,
    });

    await slot.update({ status: 'booked', lockedAt: null, lockedBy: null });

    const full = await Appointment.findByPk(apt.id, { include: aptIncludes });
    res.status(201).json({ success: true, message: 'Appointment booked', appointment: full });
  } catch (err) {
    logger.error('bookAppointment error:', err);
    res.status(500).json({ success: false, message: 'Failed to book appointment: ' + err.message });
  }
};

// ── List appointments (role-aware) ────────────────────────────────────────────
exports.getAppointments = async (req, res) => {
  try {
    const { date, status, doctorId, patientId, page = 1, limit = 50 } = req.query;
    const where = {};
    const offset = (parseInt(page) - 1) * parseInt(limit);

    if (date)   where.appointmentDate = date;
    if (status) where.status = status;

    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ where: { userId: req.user.id } });
      if (!p) return res.json({ success: true, appointments: [], total: 0 });
      where.patientId = p.id;
    } else if (req.user.role === 'doctor') {
      const d = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!d) return res.json({ success: true, appointments: [], total: 0 });
      where.doctorId = d.id;
    } else {
      if (doctorId)  where.doctorId  = doctorId;
      if (patientId) where.patientId = patientId;
    }

    const { count, rows } = await Appointment.findAndCountAll({
      where, include: aptIncludes,
      order: [['appointmentDate', 'DESC'], ['appointmentTime', 'ASC']],
      limit: parseInt(limit), offset,
    });
    res.json({ success: true, appointments: rows, total: count, pages: Math.ceil(count / parseInt(limit)) });
  } catch (err) {
    logger.error('getAppointments error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch appointments: ' + err.message });
  }
};

// ── Get single appointment ────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const apt = await Appointment.findByPk(req.params.id, { include: aptIncludes });
    if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, appointment: apt });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch appointment: ' + err.message });
  }
};

// ── Update status ─────────────────────────────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status, cancelReason, notes } = req.body;
    const apt = await Appointment.findByPk(req.params.id);
    if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (status === 'cancelled') {
      const slot = await Slot.findByPk(apt.slotId);
      if (slot) await slot.update({ status: 'available', lockedAt: null, lockedBy: null });
    }
    await apt.update({ status, cancelReason, notes });
    res.json({ success: true, message: 'Status updated', appointment: apt });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status: ' + err.message });
  }
};

// ── Today's queue for doctor ──────────────────────────────────────────────────
exports.getTodayQueue = async (req, res) => {
  try {
    let doctorId;
    if (req.user.role === 'doctor') {
      const doc = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!doc) return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      doctorId = doc.id;
    } else {
      doctorId = req.query.doctorId;
      if (!doctorId) return res.status(400).json({ success: false, message: 'doctorId query param required' });
    }

    const today = new Date().toISOString().split('T')[0];
    const queue = await Appointment.findAll({
      where: {
        doctorId,
        appointmentDate: today,
        status: { [Op.in]: ['confirmed', 'visited', 'not_visited', 'referred', 'admitted'] },
      },
      include: [
        { model: Patient, as: 'patient', include: [{ model: User, as: 'user', attributes: ['id','name','mobile'] }] },
      ],
      order: [['tokenNumber', 'ASC']],
    });
    res.json({ success: true, queue, total: queue.length, date: today });
  } catch (err) {
    logger.error('getTodayQueue error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch queue: ' + err.message });
  }
};

// ── Download appointment PDF ──────────────────────────────────────────────────
exports.downloadPDF = async (req, res) => {
  try {
    const apt = await Appointment.findByPk(req.params.id, { include: aptIncludes });
    if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const pdf = await generateAppointmentPDF(apt, apt.patient, apt.doctor, apt.doctor.department, apt.slot);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="appointment-${apt.appointmentId}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  } catch (err) {
    logger.error('downloadPDF error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF: ' + err.message });
  }
};
