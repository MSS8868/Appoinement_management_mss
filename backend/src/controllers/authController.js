const { User, Patient, Doctor, Department } = require('../models');
const { generateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// ── Send OTP ──────────────────────────────────────────────────────────────────
exports.sendOTP = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number required' });
    }

    let user = await User.findOne({ where: { mobile } });
    const otp = process.env.OTP_DEMO_MODE === 'true' ? '123456'
              : String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    if (!user) {
      user = await User.create({ id: uuidv4(), mobile, name: 'New Patient', role: 'patient', otp, otpExpiry });
    } else {
      await user.update({ otp, otpExpiry });
    }

    logger.info(`OTP for ${mobile}: ${otp}`);
    console.log(`📱 OTP for ${mobile}: ${otp}`);

    res.json({
      success: true,
      message: process.env.OTP_DEMO_MODE === 'true'
        ? `Demo OTP: ${otp}`
        : 'OTP sent to your mobile number',
      isNewUser: user.name === 'New Patient',
      demoOtp: process.env.OTP_DEMO_MODE === 'true' ? otp : undefined,
    });
  } catch (err) {
    logger.error('sendOTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// ── Verify OTP ────────────────────────────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ success: false, message: 'Mobile and OTP required' });

    const user = await User.findOne({ where: { mobile } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found. Please enter mobile and request OTP first.' });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (new Date() > new Date(user.otpExpiry)) return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });

    await user.update({ otp: null, otpExpiry: null, lastLogin: new Date() });
    const token = generateToken(user);

    let profile = null;
    let needsProfile = false;
    if (user.role === 'patient') {
      profile = await Patient.findOne({ where: { userId: user.id } });
      needsProfile = !profile;
    } else if (user.role === 'doctor') {
      profile = await Doctor.findOne({
        where: { userId: user.id },
        include: [{ model: Department, as: 'department' }],
      });
    }

    res.json({
      success: true, message: 'Login successful', token,
      user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role },
      profile, needsProfile,
    });
  } catch (err) {
    logger.error('verifyOTP error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ── Password login (staff / doctors) ─────────────────────────────────────────
exports.passwordLogin = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ success: false, message: 'Mobile and password required' });

    const user = await User.findOne({ where: { mobile } });
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.password) return res.status(400).json({ success: false, message: 'Use OTP login for this account' });

    const valid = await user.validatePassword(password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await user.update({ lastLogin: new Date() });
    const token = generateToken(user);

    let profile = null;
    if (user.role === 'doctor') {
      profile = await Doctor.findOne({
        where: { userId: user.id },
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'email'] },
          { model: Department, as: 'department' },
        ],
      });
    }

    res.json({
      success: true, message: 'Login successful', token,
      user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role },
      profile,
    });
  } catch (err) {
    logger.error('passwordLogin error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ── Get current user ──────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'otp', 'otpExpiry'] },
    });
    let profile = null;
    if (user.role === 'patient') {
      profile = await Patient.findOne({ where: { userId: user.id } });
    } else if (user.role === 'doctor') {
      profile = await Doctor.findOne({
        where: { userId: user.id },
        include: [{ model: Department, as: 'department' }],
      });
    }
    res.json({ success: true, user, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// ── Complete patient profile ───────────────────────────────────────────────────
exports.completePatientProfile = async (req, res) => {
  try {
    const { name, age, dateOfBirth, gender, bloodGroup, address,
            emergencyContact, emergencyContactName, existingConditions, email } = req.body;

    if (name) await req.user.update({ name, email: email || req.user.email });

    const count = await Patient.count();
    const patientId = `PAT-${String(count + 1).padStart(6, '0')}`;

    const [profile, created] = await Patient.findOrCreate({
      where: { userId: req.user.id },
      defaults: {
        id: uuidv4(), userId: req.user.id,
        age, dateOfBirth, gender: gender || 'other',
        bloodGroup, address, emergencyContact,
        emergencyContactName, existingConditions, patientId,
      },
    });
    if (!created) {
      await profile.update({ age, dateOfBirth, gender: gender || profile.gender, bloodGroup, address, emergencyContact, emergencyContactName, existingConditions });
    }
    res.json({ success: true, message: 'Profile saved', profile });
  } catch (err) {
    logger.error('completePatientProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to save profile: ' + err.message });
  }
};
