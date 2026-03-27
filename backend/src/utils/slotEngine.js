const { Op } = require('sequelize');
const { Slot, DoctorSchedule, Appointment } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate time slots for a doctor on a given date
 */
async function generateSlotsForDate(doctorId, date, slotDurationMinutes = 15) {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();

  const schedule = await DoctorSchedule.findOne({
    where: { doctorId, dayOfWeek, isActive: true },
  });

  if (!schedule) return [];

  // Check if slots already exist for this date
  const existingSlots = await Slot.findAll({ where: { doctorId, date } });
  if (existingSlots.length > 0) return existingSlots;

  const slots = [];
  const startParts = schedule.startTime.split(':');
  const endParts = schedule.endTime.split(':');

  let current = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
  const end = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

  const breakStart = schedule.breakStart
    ? parseInt(schedule.breakStart.split(':')[0]) * 60 + parseInt(schedule.breakStart.split(':')[1])
    : null;
  const breakEnd = schedule.breakEnd
    ? parseInt(schedule.breakEnd.split(':')[0]) * 60 + parseInt(schedule.breakEnd.split(':')[1])
    : null;

  let tokenNumber = 1;

  while (current + slotDurationMinutes <= end) {
    // Skip break time
    if (breakStart && breakEnd && current >= breakStart && current < breakEnd) {
      current += slotDurationMinutes;
      continue;
    }

    const slotEnd = current + slotDurationMinutes;
    const startTime = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`;
    const endTime = `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}`;

    slots.push({
      id: uuidv4(),
      doctorId,
      date,
      startTime,
      endTime,
      status: 'available',
      tokenNumber,
    });

    tokenNumber++;
    current += slotDurationMinutes;
  }

  await Slot.bulkCreate(slots);
  return Slot.findAll({ where: { doctorId, date }, order: [['startTime', 'ASC']] });
}

/**
 * Lock a slot temporarily (2-3 minutes)
 */
async function lockSlot(slotId, userId) {
  const slot = await Slot.findByPk(slotId);
  if (!slot || slot.status !== 'available') return null;

  await slot.update({
    status: 'locked',
    lockedAt: new Date(),
    lockedBy: userId,
  });
  return slot;
}

/**
 * Release expired locks (run periodically)
 */
async function releaseExpiredLocks() {
  const lockExpiry = new Date(Date.now() - 3 * 60 * 1000); // 3 minutes
  await Slot.update(
    { status: 'available', lockedAt: null, lockedBy: null },
    {
      where: {
        status: 'locked',
        lockedAt: { [Op.lt]: lockExpiry },
      },
    }
  );
}

/**
 * Get available slots for a doctor on a date
 */
async function getAvailableSlots(doctorId, date, doctor) {
  const slotDuration = doctor?.slotDuration || 15;
  await generateSlotsForDate(doctorId, date, slotDuration);
  await releaseExpiredLocks();

  return Slot.findAll({
    where: { doctorId, date, status: 'available' },
    order: [['startTime', 'ASC']],
  });
}

module.exports = { generateSlotsForDate, lockSlot, releaseExpiredLocks, getAvailableSlots };
