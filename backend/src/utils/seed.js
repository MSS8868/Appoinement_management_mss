require('dotenv').config();
const { sequelize, User, Patient, Department, Doctor, DoctorSchedule } = require('../models');
const { v4: uuidv4 } = require('uuid');

const departments = [
  { name: 'Orthopaedics',      description: 'Bone, joint, spine and trauma', icon: '🦴', color: '#E67E22' },
  { name: 'General Medicine',  description: 'Internal medicine and general health', icon: '🏥', color: '#27AE60' },
  { name: 'Cardiology',        description: 'Heart and cardiovascular care', icon: '❤️', color: '#E74C3C' },
  { name: 'Paediatrics',       description: 'Child healthcare and neonatology', icon: '👶', color: '#3498DB' },
  { name: 'Radiology',         description: 'Imaging and diagnostic radiology', icon: '🔬', color: '#9B59B6' },
  { name: 'Gastroenterology',  description: 'Digestive system and liver care', icon: '💊', color: '#1ABC9C' },
  { name: 'Gynaecology',       description: "Women's health and obstetrics", icon: '🌸', color: '#E91E63' },
  { name: 'ENT',               description: 'Ear, nose and throat', icon: '👂', color: '#FF9800' },
  { name: 'Physiotherapy',     description: 'Physical rehabilitation', icon: '💪', color: '#607D8B' },
  { name: 'Nutrition',         description: 'Diet and nutrition', icon: '🥗', color: '#8BC34A' },
  { name: 'Dentistry',         description: 'Dental and oral health', icon: '🦷', color: '#00BCD4' },
  { name: 'Ayurveda',          description: 'Traditional Ayurvedic medicine', icon: '🌿', color: '#795548' },
  { name: 'Homoeopathy',       description: 'Homeopathic treatment', icon: '🧪', color: '#FF5722' },
];

const doctors = [
  {
    name: 'Dr. Sunil N', mobile: '9800000001', email: 'dr.sunil@medicare.com',
    dept: 'Orthopaedics', spec: 'Spine Surgery & Trauma',
    qual: 'MBBS, MS Orthopaedics, Fellowship Spine Surgery (Lyon, France)',
    exp: 14, fee: 800,
    bio: 'Orthopedist with special interest in spine surgery, joint replacement and trauma. 14 years experience.',
  },
  {
    name: 'Dr. Dilip Raj K.S', mobile: '9800000002', email: 'dr.dilipraj@medicare.com',
    dept: 'General Medicine', spec: 'Internal Medicine',
    qual: 'MBBS, MD (Internal Medicine)',
    exp: 11, fee: 600,
    bio: 'Internal Medicine Physician with 11 years experience. Treats Rheumatic Heart Disease, IBS, Chronic Pain.',
  },
  {
    name: 'Dr. Sumanjita Bora', mobile: '9800000003', email: 'dr.sumanjita@medicare.com',
    dept: 'Cardiology', spec: 'Non-Invasive Cardiology',
    qual: 'MBBS, PGDCC',
    exp: 8, fee: 900,
    bio: 'Non-invasive Cardiologist and Physician with 8 years of experience.',
  },
  {
    name: 'Dr. Preeti Kathail', mobile: '9800000004', email: 'dr.preeti@medicare.com',
    dept: 'General Medicine', spec: 'General Practice & Family Medicine',
    qual: 'MBBS, PGDHHM, CCEBDM, Diploma in Family Medicine',
    exp: 25, fee: 700,
    bio: 'General physician with 25 years of experience in family medicine and chronic disease management.',
  },
  {
    name: 'Dr. Hayesh V', mobile: '9800000005', email: 'dr.hayesh@medicare.com',
    dept: 'General Medicine', spec: 'Emergency Medicine',
    qual: 'MBBS, MEM (Emergency Medicine)',
    exp: 8, fee: 600,
    bio: 'Emergency Medicine specialist with expertise in critical and urgent care.',
  },
  {
    name: 'Dr. Lavanya K', mobile: '9800000006', email: 'dr.lavanya@medicare.com',
    dept: 'General Medicine', spec: 'Diabetology & Family Medicine',
    qual: 'MBBS, Fellowship in Diabetology, Diploma in Family Medicine',
    exp: 15, fee: 650,
    bio: 'Physician with Fellowship in Diabetology. 15 years experience in diabetes and family medicine.',
  },
  {
    name: 'Dr. Shivakumar Sambargi', mobile: '9800000007', email: 'dr.shivakumar@medicare.com',
    dept: 'Paediatrics', spec: 'Pediatric Intensive Care & Neonatology',
    qual: 'MBBS, MD Pediatrics, Fellowship in Pediatric Intensive Care',
    exp: 22, fee: 800,
    bio: 'Consultant Pediatric Intensivist and Neonatologist with 22 years of experience.',
  },
  {
    name: 'Dr. Sumera Janvekar', mobile: '9800000008', email: 'dr.sumera@medicare.com',
    dept: 'Paediatrics', spec: 'Paediatrics & Critical Care',
    qual: 'MBBS, MD Paediatrics, Fellowship in Pediatric Critical Care',
    exp: 10, fee: 700,
    bio: 'Paediatrician with Fellowship in Pediatric Critical Care.',
  },
  {
    name: 'Dr. Dhanalakshmi', mobile: '9800000009', email: 'dr.dhanalakshmi@medicare.com',
    dept: 'Radiology', spec: 'Diagnostic Radiology',
    qual: 'MBBS, MD Radiology',
    exp: 25, fee: 800,
    bio: 'Radiologist with more than 25 years of experience in diagnostic imaging.',
  },
  {
    name: 'Dr. Akshay Deshpande', mobile: '9800000010', email: 'dr.akshay@medicare.com',
    dept: 'Gastroenterology', spec: 'Gastroenterology & Hepatology',
    qual: 'MBBS, DNB (Med), DNB (Gastro)',
    exp: 10, fee: 850,
    bio: 'Gastroenterologist and Hepatologist with 7 years post-medicine and 3 years post-gastroenterology.',
  },
  {
    name: 'Dr. Chaitra Gowda', mobile: '9800000011', email: 'dr.chaitra.gowda@medicare.com',
    dept: 'Gynaecology', spec: 'Gynaecology & Obstetrics',
    qual: 'MBBS, DGO, DNB',
    exp: 12, fee: 750,
    bio: "Gynecologist specialising in women's health and obstetrics care.",
  },
  {
    name: 'Dr. Chaitra B G', mobile: '9800000012', email: 'dr.chaitra.bg@medicare.com',
    dept: 'ENT', spec: 'ENT & Rhinology',
    qual: 'MBBS, MS, DNB, Fellowship in Rhinology and Skull Base Surgery',
    exp: 12, fee: 700,
    bio: 'ENT/Otorhinolaryngologist with 12 years experience. Fellowship in Rhinology and Skull Base Surgery.',
  },
  {
    name: 'Dr. Kamalika M Bhattacharya', mobile: '9800000013', email: 'dr.kamalika@medicare.com',
    dept: 'Physiotherapy', spec: 'Physiotherapy & Rehabilitation',
    qual: 'BPT, MPT',
    exp: 20, fee: 500,
    bio: 'Senior Physiotherapist with 20 years experience. Former Changi General Hospital Singapore.',
  },
  {
    name: 'Dr. Rachana Shetty', mobile: '9800000014', email: 'dr.rachana@medicare.com',
    dept: 'Ayurveda', spec: 'Ayurveda & Holistic Wellness',
    qual: 'BAMS, Dip in Beauty and Aesthetics',
    exp: 20, fee: 500,
    bio: 'Ayurveda Doctor and Wellness Coach with 20 years experience. Specialises in Reiki and Holistic care.',
  },
  {
    name: 'Dr. Muthulakshmi G', mobile: '9800000015', email: 'dr.muthulakshmi@medicare.com',
    dept: 'Homoeopathy', spec: 'Homoeopathy',
    qual: 'BHMS, Member Institute of Clinical Research MLD Trust',
    exp: 10, fee: 400,
    bio: 'BHMS Homoeopathy consultant and Member of Institute of Clinical Research MLD Trust, Palghar.',
  },
  {
    name: 'Dr. Felix Raju', mobile: '9800000016', email: 'dr.felix@medicare.com',
    dept: 'Dentistry', spec: 'Dental Surgery',
    qual: 'BDS',
    exp: 8, fee: 500,
    bio: 'Dental Surgeon (BDS) with more than 8 years of experience. Available all days.',
  },
  {
    name: 'Mrs. Kanchana', mobile: '9800000017', email: 'kanchana@medicare.com',
    dept: 'Nutrition', spec: 'Clinical Nutrition & Dietetics',
    qual: 'Fellowship Nutrition Dietetics NHCA Singapore, Certified Sports Nutritionist, Lactation Consultant',
    exp: 12, fee: 400,
    bio: 'Consultant Specialist in Nutrition, certified Sports Nutritionist and Lactation Consultant.',
  },
];

async function seed() {
  console.log('🌱 Starting seed...');
  try {
    // force:true drops and recreates all tables — clean slate
    await sequelize.sync({ force: true });
    console.log('✅ Schema created fresh');

    // Departments
    const deptMap = {};
    for (const d of departments) {
      const dept = await Department.create({ id: uuidv4(), ...d });
      deptMap[d.name] = dept.id;
    }
    console.log(`✅ ${departments.length} departments`);

    // Admin
    await User.create({ id: uuidv4(), name: 'Hospital Admin', mobile: '9999999999', email: 'admin@medicare.com', role: 'admin', password: 'Admin@123', isActive: true });
    console.log('✅ Admin: 9999999999 / Admin@123');

    // Receptionist
    await User.create({ id: uuidv4(), name: 'Priya Sharma', mobile: '9888888888', email: 'receptionist@medicare.com', role: 'receptionist', password: 'Recep@123', isActive: true });
    console.log('✅ Receptionist: 9888888888 / Recep@123');

    // Doctors
    let docCount = 0;
    for (const d of doctors) {
      const deptId = deptMap[d.dept];
      if (!deptId) { console.warn(`⚠️  Dept not found: ${d.dept}`); continue; }

      const user = await User.create({
        id: uuidv4(), name: d.name, mobile: d.mobile, email: d.email,
        role: 'doctor', password: 'Doctor@123', isActive: true,
      });

      const doctor = await Doctor.create({
        id: uuidv4(), userId: user.id, departmentId: deptId,
        specialization: d.spec, qualification: d.qual,
        experience: d.exp, bio: d.bio,
        consultationFee: d.fee, slotDuration: 15, isAvailable: true,
        languages: 'English, Kannada',
      });

      // Mon–Sat schedule
      for (const day of [1, 2, 3, 4, 5, 6]) {
        await DoctorSchedule.create({
          id: uuidv4(), doctorId: doctor.id, dayOfWeek: day,
          startTime: '09:00', endTime: '17:00',
          breakStart: '13:00', breakEnd: '14:00',
          isActive: true, maxPatients: 20,
        });
      }
      docCount++;
    }
    console.log(`✅ ${docCount} doctors with schedules`);

    // Sample patient
    const patientUser = await User.create({
      id: uuidv4(), name: 'Rajesh Kumar', mobile: '9700000001',
      email: 'rajesh@example.com', role: 'patient', isActive: true,
    });
    await Patient.create({
      id: uuidv4(), userId: patientUser.id, age: 35,
      gender: 'male', bloodGroup: 'B+',
      address: '45 MG Road, Bangalore, Karnataka 560001',
      patientId: 'PAT-000001', existingConditions: 'Hypertension',
    });
    console.log('✅ Sample patient: 9700000001 (OTP: 123456 in demo mode)');

    console.log('\n🎉 Seed complete!\n');
    console.log('LOGIN CREDENTIALS:');
    console.log('  Admin        →  9999999999  /  Admin@123');
    console.log('  Receptionist →  9888888888  /  Recep@123');
    console.log('  Doctors      →  9800000001 – 9800000017  /  Doctor@123');
    console.log('  Patient      →  9700000001  /  OTP: 123456\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}
seed();
