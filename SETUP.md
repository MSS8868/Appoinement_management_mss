# 🏥 MediCare Hospital Management System — v4

## Quick Start (3 commands)

```bash
# Terminal 1 — Backend
cd hospital-v4/backend
npm install
npm run seed          # creates fresh DB + all 17 doctors
npm run dev           # starts on http://localhost:5000

# Terminal 2 — Frontend
cd hospital-v4/frontend
npm install
npm start             # opens http://localhost:3000
```

> ⚠️ **If you already have a hospital.db from a previous version, delete it before seeding:**
> ```bash
> rm -f hospital-v4/backend/hospital.db
> npm run seed
> ```

---

## Login Credentials

| Role | Mobile | Password / OTP |
|------|--------|----------------|
| Admin | 9999999999 | Admin@123 |
| Receptionist | 9888888888 | Recep@123 |
| Dr. Sunil N (Ortho) | 9800000001 | Doctor@123 |
| Dr. Dilip Raj (Medicine) | 9800000002 | Doctor@123 |
| Dr. Sumanjita Bora (Cardio) | 9800000003 | Doctor@123 |
| Dr. Preeti Kathail (Medicine) | 9800000004 | Doctor@123 |
| Dr. Hayesh V (Emergency) | 9800000005 | Doctor@123 |
| Dr. Lavanya K (Diabetology) | 9800000006 | Doctor@123 |
| Dr. Shivakumar (Paeds) | 9800000007 | Doctor@123 |
| Dr. Sumera Janvekar (Paeds) | 9800000008 | Doctor@123 |
| Dr. Dhanalakshmi (Radiology) | 9800000009 | Doctor@123 |
| Dr. Akshay Deshpande (Gastro) | 9800000010 | Doctor@123 |
| Dr. Chaitra Gowda (Gynae) | 9800000011 | Doctor@123 |
| Dr. Chaitra B G (ENT) | 9800000012 | Doctor@123 |
| Dr. Kamalika (Physio) | 9800000013 | Doctor@123 |
| Dr. Rachana Shetty (Ayurveda) | 9800000014 | Doctor@123 |
| Dr. Muthulakshmi (Homeo) | 9800000015 | Doctor@123 |
| Dr. Felix Raju (Dental) | 9800000016 | Doctor@123 |
| Mrs. Kanchana (Nutrition) | 9800000017 | Doctor@123 |
| Patient (sample) | 9700000001 | OTP: **123456** |
| Any new mobile | Any 10 digits | OTP: **123456** |

---

## What Was Fixed in v4

### Bug 1: Doctor names not visible
**Cause:** Old `hospital.db` used Sequelize ENUM columns. SQLite + `alter:true` breaks ENUM columns during schema migration, corrupting the User→Doctor join.  
**Fix:** All models now use plain `STRING` instead of `ENUM`. The seed uses `force:true` to always create a clean schema. The server uses `force:false, alter:false` to never touch the live schema.

### Bug 2: Doctor queue 500 error  
**Cause:** Two issues: (a) stale DB with broken schema, (b) `getTodayQueue` returned empty because `referred` and `admitted` statuses weren't included in the filter.  
**Fix:** Queue now fetches `status IN (confirmed, visited, not_visited, referred, admitted)`. Doctor profile lookup by `userId` is now robust with proper error messages.

### Bug 3: AI process 500 error
**Cause:** Express matched `POST /consultations/ai/process` as `POST /consultations/:appointmentId` because the static route came after the parameterized one.  
**Fix:** Routes file rewritten with all static paths strictly before parameterized paths.

---

## Environment Variables (backend/.env)

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=change_this_in_production
JWT_EXPIRES_IN=7d
DB_STORAGE=./hospital.db
OTP_DEMO_MODE=true
ANTHROPIC_API_KEY=your_key_here   # optional, uses mock mode if not set
HOSPITAL_NAME=MediCare Multi-Specialty Hospital
HOSPITAL_ADDRESS=123 Health Avenue, Bangalore, Karnataka 560001
HOSPITAL_PHONE=+91-80-12345678
HOSPITAL_EMAIL=info@medicare-hospital.com
FRONTEND_URL=http://localhost:3000
```

---

## AI Features

- Set `ANTHROPIC_API_KEY` in `.env` for real AI processing
- Without a key: mock mode auto-activates (keyword extraction for common medicines/tests)
- Voice input: works in Chrome and Edge (Web Speech API)
- Keyboard shortcut: `Ctrl+Enter` to submit AI input

---

## Deployment

### Backend → Railway.app
1. Push to GitHub
2. New project on railway.app → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. For PostgreSQL: Railway provides a Postgres plugin — update `DB_STORAGE` to use `postgres://` URL

### Frontend → Vercel
1. Push frontend folder to GitHub
2. Import on vercel.com
3. Set `REACT_APP_API_URL=https://your-railway-url.up.railway.app/api`
4. Deploy

### Domain
1. Buy domain on Namecheap/GoDaddy (~₹800/year)
2. In Vercel: Settings → Domains → Add your domain
3. Vercel gives you CNAME/A records — add them to your domain registrar DNS
4. SSL is automatic via Vercel

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Recharts |
| Backend | Node.js 18+, Express 4 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | Sequelize 6 |
| Auth | JWT + OTP |
| AI | Anthropic Claude API |
| PDF | PDFKit + QRCode |
| Styling | Custom CSS (DM Sans + Playfair Display) |
