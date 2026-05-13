# MediSaathi 🏥 — Your Personal Medical Companion

MediSaathi is a premium, AI-first healthcare platform designed to empower elderly patients and their caregivers. It simplifies medication management through advanced OCR prescription scanning, AI-driven drug interaction safety checks, and predictive adherence monitoring.

---

## 🌟 Key Features

### 1. 👁️ AI Prescription Scanner (OCR)
Upload any handwritten or printed prescription. Using **Google Gemini 1.5 Flash**, the system extracts medicine names, dosages, and schedules with high precision, eliminating manual entry errors.

### 2. 🛡️ Drug Interaction Guardrail
Before adding a new medication, our AI analyzes your entire medical profile to detect potential **Drug-Drug Interactions (DDI)**, ensuring your safety with every new dose.

### 3. 🧠 Predictive Adherence (ML)
A dedicated **FastAPI Machine Learning service** analyzes your dose patterns (Taken vs. Missed) to predict high-risk periods. It provides personalized micro-interventions to keep you on track.

### 4. 📞 Emergency AI Escalation (Twilio)
If a critical dose is missed, MediSaathi doesn't just send a notification. It triggers an **automated AI voice call** to your primary emergency contact via Twilio to ensure immediate intervention.

### 5. 👵 Elderly-Centric Design
Featuring a high-contrast, warm aesthetic, large typography, and **multilingual support (Hindi/English)** to make healthcare accessible for everyone.

---

## 🏗️ Tech Stack

- **Frontend/Core**: Next.js 14, Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: Next.js API Routes (Node.js).
- **ML Service**: Python FastAPI, Scikit-Learn, Pandas.
- **Database**: MongoDB (Mongoose).
- **AI Models**: Google Gemini 1.5 Flash.
- **Storage**: Cloudinary (Prescription images).
- **Communication**: Twilio (Automated Voice Calls).

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd medisathi
```

### 2. Configure Environment Variables
Create a `.env.local` in the root and `apps/web/` directory:
```bash
# Database
MONGODB_URI="your_mongodb_uri"

# AI & Media
GEMINI_API_KEY="your_gemini_key"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# ML Communication
ML_API_URL="http://localhost:8000"
ML_API_SECRET="local-dev-secret-key"

# Emergency Calls (Twilio)
TWILIO_ACCOUNT_SID="your_sid"
TWILIO_AUTH_TOKEN="your_token"
TWILIO_PHONE_NUMBER="your_twilio_number"
```

### 3. Run the Services

You need two terminals running simultaneously:

**Terminal 1: Next.js (Web & API)**
```bash
cd apps/web
npm install
npm run dev
```

**Terminal 2: Python (ML API)**
```bash
cd apps/ml-api
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 🧪 Testing the Platform

1.  **Seed Data**: Populate the database with a test user "Sunita Devi":
    ```bash
    cd apps/web
    node src/seed/seed.js
    ```
2.  **Login**: Use the seeded credentials:
    - **Email**: `sunita@gmail.com`
    - **Password**: `Sunita@123`
3.  **Scan**: Upload a prescription image in the "Scan Rx" section.
4.  **Log**: Mark a dose as "Taken" or "Missed" and check the ML logs in `apps/ml-api/data/training_data.csv`.

---

**MediSaathi** — *Building a safer, AI-first healthcare experience for our elders.* 👵❤️
