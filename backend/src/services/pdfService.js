const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const HOSPITAL_NAME = process.env.HOSPITAL_NAME || 'MediCare Multi-Specialty Hospital';
const HOSPITAL_ADDRESS = process.env.HOSPITAL_ADDRESS || '123 Health Avenue, Bangalore, Karnataka 560001';
const HOSPITAL_PHONE = process.env.HOSPITAL_PHONE || '+91-80-12345678';

/**
 * Generate appointment PDF and return buffer
 */
async function generateAppointmentPDF(appointment, patient, doctor, department, slot) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Generate QR Code
      const qrData = JSON.stringify({
        appointmentId: appointment.appointmentId,
        patient: patient.user?.name,
        doctor: doctor.user?.name,
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        token: appointment.tokenNumber,
      });
      const qrBuffer = await QRCode.toBuffer(qrData, { width: 100 });

      // ===== HEADER =====
      doc.rect(0, 0, doc.page.width, 100).fill('#0D47A1');
      doc.fillColor('white').font('Helvetica-Bold').fontSize(20).text(HOSPITAL_NAME, 40, 20);
      doc.font('Helvetica').fontSize(9).text(HOSPITAL_ADDRESS, 40, 48);
      doc.text(`📞 ${HOSPITAL_PHONE}`, 40, 62);
      doc.image(qrBuffer, doc.page.width - 140, 10, { width: 80 });

      // ===== TITLE =====
      doc.fillColor('#0D47A1').font('Helvetica-Bold').fontSize(16)
        .text('APPOINTMENT CONFIRMATION', 40, 120, { align: 'center' });
      doc.moveTo(40, 145).lineTo(doc.page.width - 40, 145).strokeColor('#0D47A1').lineWidth(2).stroke();

      // ===== APPOINTMENT INFO =====
      let y = 160;
      const col1 = 40, col2 = 300;

      const drawRow = (label, value, x, yPos) => {
        doc.fillColor('#555').font('Helvetica').fontSize(9).text(label, x, yPos);
        doc.fillColor('#111').font('Helvetica-Bold').fontSize(10).text(value || '-', x, yPos + 13);
      };

      doc.fillColor('#0D47A1').font('Helvetica-Bold').fontSize(11).text('Appointment Details', col1, y);
      y += 20;

      drawRow('APPOINTMENT ID', appointment.appointmentId, col1, y);
      drawRow('TOKEN NUMBER', `#${appointment.tokenNumber}`, col2, y);
      y += 40;

      drawRow('DATE', new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), col1, y);
      drawRow('TIME', appointment.appointmentTime, col2, y);
      y += 40;

      drawRow('APPOINTMENT TYPE', appointment.type === 'new' ? 'New Consultation' : 'Follow-Up', col1, y);
      drawRow('STATUS', appointment.status.toUpperCase(), col2, y);
      y += 50;

      // Divider
      doc.moveTo(col1, y).lineTo(doc.page.width - 40, y).strokeColor('#ddd').lineWidth(1).stroke();
      y += 15;

      // Patient Info
      doc.fillColor('#0D47A1').font('Helvetica-Bold').fontSize(11).text('Patient Details', col1, y);
      y += 20;

      drawRow('PATIENT NAME', patient.user?.name, col1, y);
      drawRow('PATIENT ID', patient.patientId, col2, y);
      y += 40;

      drawRow('GENDER', patient.gender?.toUpperCase(), col1, y);
      drawRow('BLOOD GROUP', patient.bloodGroup || 'Not specified', col2, y);
      y += 40;

      drawRow('MOBILE', patient.user?.mobile, col1, y);
      y += 50;

      // Divider
      doc.moveTo(col1, y).lineTo(doc.page.width - 40, y).strokeColor('#ddd').lineWidth(1).stroke();
      y += 15;

      // Doctor Info
      doc.fillColor('#0D47A1').font('Helvetica-Bold').fontSize(11).text('Doctor Details', col1, y);
      y += 20;

      drawRow('DOCTOR NAME', doctor.user?.name, col1, y);
      drawRow('DEPARTMENT', department?.name, col2, y);
      y += 40;

      drawRow('SPECIALIZATION', doctor.specialization, col1, y);
      drawRow('CONSULTATION FEE', `₹${doctor.consultationFee}`, col2, y);
      y += 60;

      // Instructions
      doc.rect(col1, y, doc.page.width - 80, 80).fillColor('#EEF2FF').fill();
      doc.fillColor('#0D47A1').font('Helvetica-Bold').fontSize(10).text('Important Instructions', col1 + 10, y + 8);
      doc.fillColor('#333').font('Helvetica').fontSize(8)
        .text('• Please arrive 10 minutes before your appointment time.', col1 + 10, y + 22)
        .text('• Bring this appointment slip and any previous medical records.', col1 + 10, y + 34)
        .text('• Contact us at least 2 hours before to reschedule or cancel.', col1 + 10, y + 46)
        .text('• This appointment slip must be presented at the reception desk.', col1 + 10, y + 58);
      y += 95;

      // Footer
      doc.moveTo(col1, y).lineTo(doc.page.width - 40, y).strokeColor('#0D47A1').lineWidth(1).stroke();
      y += 10;
      doc.fillColor('#888').font('Helvetica').fontSize(8)
        .text(`Generated on: ${new Date().toLocaleString('en-IN')} | ${HOSPITAL_NAME}`, col1, y, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate consultation/prescription PDF
 */
async function generatePrescriptionPDF(consultation, appointment, patient, doctor) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      let medicines = [];
      let tests = [];
      let vitals = {};
      try { medicines = JSON.parse(consultation.medicines || '[]'); } catch {}
      try { tests = JSON.parse(consultation.testsAdvised || '[]'); } catch {}
      try { vitals = JSON.parse(consultation.vitals || '{}'); } catch {}

      // Header
      doc.rect(0, 0, doc.page.width, 100).fill('#1B5E20');
      doc.fillColor('white').font('Helvetica-Bold').fontSize(20).text(HOSPITAL_NAME, 40, 15);
      doc.font('Helvetica').fontSize(9).text(HOSPITAL_ADDRESS, 40, 42);
      doc.text(`📞 ${HOSPITAL_PHONE}`, 40, 55);
      doc.font('Helvetica-Bold').fontSize(12).text('PRESCRIPTION / CONSULTATION NOTES', 40, 72, { align: 'right', width: doc.page.width - 80 });

      let y = 115;

      // Doctor stamp area
      doc.rect(40, y, doc.page.width - 80, 55).fillColor('#F1F8E9').fill();
      doc.fillColor('#1B5E20').font('Helvetica-Bold').fontSize(12).text(doctor.user?.name, 50, y + 8);
      doc.fillColor('#555').font('Helvetica').fontSize(9)
        .text(doctor.qualification, 50, y + 24)
        .text(doctor.specialization, 50, y + 36)
        .text(`Reg. No: ${doctor.registrationNumber || 'N/A'}`, 50, y + 48);

      const col2 = 320;
      doc.fillColor('#333').font('Helvetica').fontSize(9)
        .text(`Date: ${new Date(consultation.visitDate).toLocaleDateString('en-IN')}`, col2, y + 8)
        .text(`Patient: ${patient.user?.name}`, col2, y + 20)
        .text(`Age/Gender: ${patient.age || '-'} yrs / ${patient.gender}`, col2, y + 32)
        .text(`ID: ${patient.patientId}`, col2, y + 44);
      y += 70;

      // Vitals
      if (vitals && Object.keys(vitals).length > 0) {
        doc.fillColor('#1B5E20').font('Helvetica-Bold').fontSize(10).text('Vitals', 40, y);
        y += 15;
        const vitalItems = [
          vitals.bp ? `BP: ${vitals.bp}` : null,
          vitals.pulse ? `Pulse: ${vitals.pulse} bpm` : null,
          vitals.temp ? `Temp: ${vitals.temp}°F` : null,
          vitals.weight ? `Weight: ${vitals.weight} kg` : null,
          vitals.height ? `Height: ${vitals.height} cm` : null,
          vitals.spo2 ? `SpO2: ${vitals.spo2}%` : null,
        ].filter(Boolean);

        doc.fillColor('#333').font('Helvetica').fontSize(9).text(vitalItems.join('  |  '), 40, y);
        y += 20;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#ddd').lineWidth(0.5).stroke();
        y += 10;
      }

      // Chief Complaint
      if (consultation.chiefComplaint) {
        doc.fillColor('#1B5E20').font('Helvetica-Bold').fontSize(10).text('Chief Complaint', 40, y);
        y += 14;
        doc.fillColor('#333').font('Helvetica').fontSize(10).text(consultation.chiefComplaint, 40, y, { width: doc.page.width - 80 });
        y += doc.heightOfString(consultation.chiefComplaint, { width: doc.page.width - 80 }) + 10;
      }

      // Symptoms & Duration
      if (consultation.symptoms) {
        doc.fillColor('#1B5E20').font('Helvetica-Bold').fontSize(10).text('Symptoms', 40, y);
        if (consultation.duration) {
          doc.fillColor('#888').font('Helvetica').fontSize(9).text(`Duration: ${consultation.duration}`, 200, y);
        }
        y += 14;
        doc.fillColor('#333').font('Helvetica').fontSize(10).text(consultation.symptoms, 40, y, { width: doc.page.width - 80 });
        y += doc.heightOfString(consultation.symptoms, { width: doc.page.width - 80 }) + 10;
      }

      // Diagnosis
      if (consultation.diagnosis) {
        doc.fillColor('#1B5E20').font('Helvetica-Bold').fontSize(10).text('Diagnosis', 40, y);
        y += 14;
        doc.fillColor('#111').font('Helvetica-Bold').fontSize(10).text(consultation.diagnosis, 40, y, { width: doc.page.width - 80 });
        y += doc.heightOfString(consultation.diagnosis, { width: doc.page.width - 80 }) + 15;
      }

      // Rx - Medicines
      if (medicines.length > 0) {
        doc.fillColor('#1B5E20').font('Helvetica-Bold').fontSize(12).text('℞  Medicines', 40, y);
        y += 18;
        medicines.forEach((med, i) => {
          doc.fillColor('#111').font('Helvetica-Bold').fontSize(10).text(`${i + 1}. ${med.name}`, 50, y);
          doc.fillColor('#555').font('Helvetica').fontSize(9)
            .text(`${med.dosage || ''} - ${med.frequency || ''} - ${med.duration || ''}  ${med.instructions || ''}`, 50, y + 13);
          y += 30;
        });
        y += 5;
      }

      // Tests
      if (tests.length > 0) {
        doc.fillColor('#1B5E20').font('Helvetica-Bold').fontSize(11).text('Tests Advised', 40, y);
        y += 15;
        tests.forEach((test, i) => {
          doc.fillColor('#333').font('Helvetica').fontSize(10).text(`${i + 1}. ${test.name || test}`, 50, y);
          y += 16;
        });
        y += 5;
      }

      // Clinical Notes
      if (consultation.clinicalNotes) {
        doc.fillColor('#1B5E20').font('Helvetica-Bold').fontSize(10).text('Clinical Notes', 40, y);
        y += 14;
        doc.fillColor('#555').font('Helvetica').fontSize(9).text(consultation.clinicalNotes, 40, y, { width: doc.page.width - 80 });
        y += doc.heightOfString(consultation.clinicalNotes, { width: doc.page.width - 80 }) + 10;
      }

      // Follow-up
      if (consultation.followUpDate) {
        doc.rect(40, y, doc.page.width - 80, 30).fillColor('#FFF8E1').fill();
        doc.fillColor('#E65100').font('Helvetica-Bold').fontSize(10)
          .text(`Follow-up: ${new Date(consultation.followUpDate).toLocaleDateString('en-IN')}  ${consultation.followUpNotes || ''}`, 50, y + 10);
        y += 40;
      }

      // Signature
      y = Math.max(y, doc.page.height - 120);
      doc.moveTo(col2, y).lineTo(doc.page.width - 40, y).strokeColor('#333').lineWidth(0.5).stroke();
      doc.fillColor('#111').font('Helvetica-Bold').fontSize(9).text(doctor.user?.name, col2, y + 5, { width: doc.page.width - col2 - 40, align: 'center' });
      doc.fillColor('#555').font('Helvetica').fontSize(8).text('Doctor\'s Signature', col2, y + 17, { width: doc.page.width - col2 - 40, align: 'center' });

      // Footer
      doc.moveTo(40, doc.page.height - 35).lineTo(doc.page.width - 40, doc.page.height - 35).strokeColor('#1B5E20').lineWidth(1).stroke();
      doc.fillColor('#888').font('Helvetica').fontSize(7)
        .text(`This prescription is valid for 30 days from date of issue. | ${HOSPITAL_NAME} | Generated: ${new Date().toLocaleString('en-IN')}`,
          40, doc.page.height - 25, { align: 'center', width: doc.page.width - 80 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateAppointmentPDF, generatePrescriptionPDF };
