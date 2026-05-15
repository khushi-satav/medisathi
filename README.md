# MediSaathi 🏥 — Your Premium AI-First Healthcare Companion

MediSaathi is a sophisticated, AI-driven healthcare ecosystem designed to empower elderly patients and provide peace of mind to their caregivers. By bridging advanced Machine Learning with a warm, accessible user interface, MediSaathi transforms complex medication management into a seamless, automated experience.

---

## 🌟 Key Features

### 1. 👁️ Live AI Prescription Scanner (WebRTC + OCR)
Experience real-time medical digitization. Our scanner uses a **Live WebRTC Camera** interface with professional scanning overlays to capture prescriptions. Using **Google Gemini 1.5 Flash**, the system extracts medicine names, dosages, and schedules with near-perfect accuracy.

### 2. 🛡️ Caregiver Monitoring System
Bridge the gap between generations. Patients can invite caregivers (family members or doctors) to monitor their adherence in real-time. Caregivers receive instant alerts for missed doses and can track recovery progress via a dedicated dashboard.

### 3. 🧠 Predictive Adherence Micro-service
Powered by a **FastAPI Machine Learning service**, MediSaathi doesn't just track history—it predicts the future. By analyzing past dose patterns (Taken vs. Missed), the AI identifies high-risk periods and triggers preventative micro-interventions.

### 4. 📞 Critical AI Voice Escalation (Twilio)
When safety is at stake, a notification isn't enough. If a high-priority dose is missed, MediSaathi initiates an **automated AI voice call** to emergency contacts via Twilio, ensuring immediate human intervention.

### 5. 👵 Elderly-Centric Design System
A high-fidelity interface featuring:
- **Glassmorphic Aesthetics**: Modern, premium feel with vibrant, accessible color palettes.
- **Multilingual Support**: Seamlessly switch between **Hindi and English**.
- **Large Typography**: Optimized for visual clarity for elderly users.

---

## 🏗️ Project Architecture

```text
medisathi/
├── apps/
│   ├── web/           # Next.js 14 Frontend & API Core (Node.js)
│   └── ml-api/        # Python FastAPI ML Micro-service
├── docker-compose.yml # Full-stack containerization
└── README.md
```

---

## 🚀 Installation & Local Development

### 1. Prerequisites
- Node.js 18+ & npm
- Python 3.9+
- MongoDB Instance (Atlas or Local)
- Cloudinary Account (for image processing)

### 2. Environment Setup
Create a `.env.local` in `apps/web/` and configure the following:

```bash
# Core
MONGODB_URI="your_mongodb_uri"
NEXTAUTH_SECRET="your_secret"

# AI & Media
GEMINI_API_KEY="your_gemini_api_key"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# ML & Integrations
ML_API_URL="http://localhost:8000"
TWILIO_ACCOUNT_SID="your_sid"
TWILIO_AUTH_TOKEN="your_token"
TWILIO_PHONE_NUMBER="your_phone_number"
```

### 3. Running Services

**Terminal 1: Web Frontend**
```bash
cd apps/web
npm install
npm run dev
```

**Terminal 2: ML API**
```bash
cd apps/ml-api
python -m venv venv
# Activate venv: .\venv\Scripts\activate (Windows) or source venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
uvicorn main:app --port 8000
```

---

## 🌍 Deployment Strategy

### Frontend (Netlify)
MediSaathi is optimized for Netlify deployment using a Monorepo configuration:
- **Base Directory**: `apps/web`
- **Build Command**: `npm run build`
- **Publish Directory**: `.next`
- **Environment Variables**: Mirror your `.env.local` in the Netlify Dashboard.

### ML Service (Render / Railway)
The Python micro-service should be deployed to a container-friendly host:
- **Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Link**: Update the `ML_API_URL` in your Next.js environment to point to this deployed URL.

---

## 🧪 Testing
1. **Seed Data**: Run `node src/seed/seed.js` inside `apps/web` to create the default patient "Sunita Devi".
2. **Login**: Use `sunita@gmail.com` / `Sunita@123`.
3. **Scan**: Try the "Live AI Scanner" with a sample prescription.

---

**MediSaathi** — *Building a safer, AI-first healthcare experience for our elders.* 👵❤️
