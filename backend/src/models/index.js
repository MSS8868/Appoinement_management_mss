const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

// ── USER ──────────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mobile:       { type: DataTypes.STRING(15), unique: true, allowNull: false },
  email:        { type: DataTypes.STRING, unique: true, allowNull: true },
  name:         { type: DataTypes.STRING, allowNull: false },
  role:         { type: DataTypes.STRING(20), defaultValue: 'patient' }, // patient|doctor|receptionist|admin
  password:     { type: DataTypes.STRING, allowNull: true },
  otp:          { type: DataTypes.STRING(10), allowNull: true },
  otpExpiry:    { type: DataTypes.DATE, allowNull: true },
  isActive:     { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLogin:    { type: DataTypes.DATE, allowNull: true },
  profilePhoto: { type: DataTypes.STRING, allowNull: true },
}, {
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password') && user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});
User.prototype.validatePassword = function (pw) {
  return bcrypt.compare(pw, this.password);
};

// ── PATIENT ───────────────────────────────────────────────────────────────────
const Patient = sequelize.define('Patient', {
  id:                   { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:               { type: DataTypes.UUID, allowNull: false },
  dateOfBirth:          { type: DataTypes.DATEONLY, allowNull: true },
  age:                  { type: DataTypes.INTEGER, allowNull: true },
  gender:               { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'other' },
  bloodGroup:           { type: DataTypes.STRING(5), allowNull: true },
  address:              { type: DataTypes.TEXT, allowNull: true },
  emergencyContact:     { type: DataTypes.STRING(15), allowNull: true },
  emergencyContactName: { type: DataTypes.STRING, allowNull: true },
  existingConditions:   { type: DataTypes.TEXT, allowNull: true },
  allergies:            { type: DataTypes.TEXT, allowNull: true },
  patientId:            { type: DataTypes.STRING, unique: true },
});

// ── DEPARTMENT ────────────────────────────────────────────────────────────────
const Department = sequelize.define('Department', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  icon:        { type: DataTypes.STRING(10), allowNull: true },
  isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },
  color:       { type: DataTypes.STRING(10), defaultValue: '#4A90E2' },
});

// ── DOCTOR ────────────────────────────────────────────────────────────────────
const Doctor = sequelize.define('Doctor', {
  id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:             { type: DataTypes.UUID, allowNull: false },
  departmentId:       { type: DataTypes.UUID, allowNull: false },
  specialization:     { type: DataTypes.STRING, allowNull: false },
  qualification:      { type: DataTypes.STRING, allowNull: false },
  experience:         { type: DataTypes.INTEGER, defaultValue: 0 },
  bio:                { type: DataTypes.TEXT, allowNull: true },
  consultationFee:    { type: DataTypes.FLOAT, defaultValue: 500 },
  slotDuration:       { type: DataTypes.INTEGER, defaultValue: 15 },
  isAvailable:        { type: DataTypes.BOOLEAN, defaultValue: true },
  registrationNumber: { type: DataTypes.STRING, allowNull: true },
  languages:          { type: DataTypes.STRING, defaultValue: 'English, Kannada' },
});

// ── DOCTOR SCHEDULE ───────────────────────────────────────────────────────────
const DoctorSchedule = sequelize.define('DoctorSchedule', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  doctorId:    { type: DataTypes.UUID, allowNull: false },
  dayOfWeek:   { type: DataTypes.INTEGER, allowNull: false },
  startTime:   { type: DataTypes.STRING(8), allowNull: false },
  endTime:     { type: DataTypes.STRING(8), allowNull: false },
  isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },
  maxPatients: { type: DataTypes.INTEGER, defaultValue: 20 },
  breakStart:  { type: DataTypes.STRING(8), allowNull: true },
  breakEnd:    { type: DataTypes.STRING(8), allowNull: true },
});

// ── SLOT ──────────────────────────────────────────────────────────────────────
const Slot = sequelize.define('Slot', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  doctorId:    { type: DataTypes.UUID, allowNull: false },
  date:        { type: DataTypes.DATEONLY, allowNull: false },
  startTime:   { type: DataTypes.STRING(8), allowNull: false },
  endTime:     { type: DataTypes.STRING(8), allowNull: false },
  status:      { type: DataTypes.STRING(10), defaultValue: 'available' }, // available|booked|locked|blocked
  lockedAt:    { type: DataTypes.DATE, allowNull: true },
  lockedBy:    { type: DataTypes.UUID, allowNull: true },
  tokenNumber: { type: DataTypes.INTEGER, allowNull: true },
});

// ── APPOINTMENT ───────────────────────────────────────────────────────────────
const Appointment = sequelize.define('Appointment', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  appointmentId:   { type: DataTypes.STRING, unique: true },
  patientId:       { type: DataTypes.UUID, allowNull: false },
  doctorId:        { type: DataTypes.UUID, allowNull: false },
  slotId:          { type: DataTypes.UUID, allowNull: false },
  departmentId:    { type: DataTypes.UUID, allowNull: false },
  appointmentDate: { type: DataTypes.DATEONLY, allowNull: false },
  appointmentTime: { type: DataTypes.STRING(8), allowNull: false },
  tokenNumber:     { type: DataTypes.INTEGER, allowNull: true },
  status:          { type: DataTypes.STRING(20), defaultValue: 'confirmed' }, // confirmed|visited|not_visited|cancelled|referred|admitted
  type:            { type: DataTypes.STRING(15), defaultValue: 'new' },       // new|follow_up
  cancelReason:    { type: DataTypes.TEXT, allowNull: true },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  bookedBy:        { type: DataTypes.STRING(15), defaultValue: 'patient' },   // patient|receptionist
  isEmergency:     { type: DataTypes.BOOLEAN, defaultValue: false },
});

// ── CONSULTATION ──────────────────────────────────────────────────────────────
const Consultation = sequelize.define('Consultation', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  appointmentId:  { type: DataTypes.UUID, allowNull: false },
  patientId:      { type: DataTypes.UUID, allowNull: false },
  doctorId:       { type: DataTypes.UUID, allowNull: false },
  visitDate:      { type: DataTypes.DATEONLY, allowNull: false },
  chiefComplaint: { type: DataTypes.TEXT, allowNull: true },
  symptoms:       { type: DataTypes.TEXT, allowNull: true },
  duration:       { type: DataTypes.STRING, allowNull: true },
  diagnosis:      { type: DataTypes.TEXT, allowNull: true },
  clinicalNotes:  { type: DataTypes.TEXT, allowNull: true },
  medicines:      { type: DataTypes.TEXT, allowNull: true },   // JSON string
  testsAdvised:   { type: DataTypes.TEXT, allowNull: true },   // JSON string
  followUpDate:   { type: DataTypes.DATEONLY, allowNull: true },
  followUpNotes:  { type: DataTypes.TEXT, allowNull: true },
  vitals:         { type: DataTypes.TEXT, allowNull: true },   // JSON string
  aiGenerated:    { type: DataTypes.BOOLEAN, defaultValue: false },
  rawAiInput:     { type: DataTypes.TEXT, allowNull: true },
});

// ── FOLLOW-UP ─────────────────────────────────────────────────────────────────
const FollowUp = sequelize.define('FollowUp', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  consultationId:   { type: DataTypes.UUID, allowNull: false },
  appointmentId:    { type: DataTypes.UUID, allowNull: false },
  patientId:        { type: DataTypes.UUID, allowNull: false },
  doctorId:         { type: DataTypes.UUID, allowNull: false },
  followUpDate:     { type: DataTypes.DATEONLY, allowNull: false },
  followUpNotes:    { type: DataTypes.TEXT, allowNull: true },
  status:           { type: DataTypes.STRING(20), defaultValue: 'pending' }, // pending|accepted|rejected|rescheduled|booked
  patientResponse:  { type: DataTypes.TEXT, allowNull: true },
  rescheduleDate:   { type: DataTypes.DATEONLY, allowNull: true },
  newAppointmentId: { type: DataTypes.UUID, allowNull: true },
  notifiedAt:       { type: DataTypes.DATE, allowNull: true },
});

// ── AUDIT LOG ─────────────────────────────────────────────────────────────────
const AuditLog = sequelize.define('AuditLog', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:    { type: DataTypes.UUID, allowNull: true },
  action:    { type: DataTypes.STRING, allowNull: false },
  entity:    { type: DataTypes.STRING, allowNull: true },
  entityId:  { type: DataTypes.UUID, allowNull: true },
  oldValues: { type: DataTypes.TEXT, allowNull: true },
  newValues: { type: DataTypes.TEXT, allowNull: true },
  ipAddress: { type: DataTypes.STRING, allowNull: true },
  userAgent: { type: DataTypes.TEXT, allowNull: true },
});

// ── ASSOCIATIONS ──────────────────────────────────────────────────────────────
User.hasOne(Patient, { foreignKey: 'userId', as: 'patientProfile' });
Patient.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Doctor, { foreignKey: 'userId', as: 'doctorProfile' });
Doctor.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Department.hasMany(Doctor, { foreignKey: 'departmentId', as: 'doctors' });
Doctor.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

Doctor.hasMany(DoctorSchedule, { foreignKey: 'doctorId', as: 'schedules' });
DoctorSchedule.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

Doctor.hasMany(Slot, { foreignKey: 'doctorId', as: 'slots' });
Slot.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

Patient.hasMany(Appointment, { foreignKey: 'patientId', as: 'appointments' });
Appointment.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Doctor.hasMany(Appointment, { foreignKey: 'doctorId', as: 'appointments' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

Slot.hasOne(Appointment, { foreignKey: 'slotId', as: 'appointment' });
Appointment.belongsTo(Slot, { foreignKey: 'slotId', as: 'slot' });

Appointment.hasOne(Consultation, { foreignKey: 'appointmentId', as: 'consultation' });
Consultation.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });

Patient.hasMany(FollowUp, { foreignKey: 'patientId', as: 'followUps' });
FollowUp.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Doctor.hasMany(FollowUp, { foreignKey: 'doctorId', as: 'followUps' });
FollowUp.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

Consultation.hasOne(FollowUp, { foreignKey: 'consultationId', as: 'followUp' });
FollowUp.belongsTo(Consultation, { foreignKey: 'consultationId', as: 'consultation' });

Appointment.hasMany(FollowUp, { foreignKey: 'appointmentId', as: 'followUps' });
FollowUp.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'sourceAppointment' });

module.exports = {
  sequelize,
  User, Patient, Department, Doctor, DoctorSchedule,
  Slot, Appointment, Consultation, FollowUp, AuditLog,
};
