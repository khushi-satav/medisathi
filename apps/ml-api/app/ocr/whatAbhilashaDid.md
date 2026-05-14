# MediSathi OCR Backend – Handoff Notes

## Project Overview

This backend is responsible for:

* Uploading prescription images
* Running OCR using PaddleOCR
* Extracting medicine names
* Fuzzy matching medicines against a dataset
* Extracting:

  * dosage
  * frequency
  * duration
  * food instructions
* Returning structured JSON responses

Current stack:

* FastAPI
* PaddleOCR
* OpenCV
* RapidFuzz
* Pandas

---

# Folder Structure

```text
medisathi/
├── apps/
│   └── ml-api/
│       ├── app/
│       │   ├── api/
│       │   │   └── scan.py
│       │   ├── ocr/
│       │   │   ├── extractor.py
│       │   │   ├── preprocess.py
│       │   │   ├── medicine_parser.py
│       │   │   ├── data/
│       │   │   └── test_all_images.py
│       │   └── main.py
│       ├── datasets/
│       │   └── medications.csv
│       └── requirements.txt
```

---

# Backend Setup

## 1. Create Virtual Environment

```bash
python3 -m venv .venv
```

---

## 2. Activate venv

Mac/Linux:

```bash
source .venv/bin/activate
```

Windows:

```bash
.venv\Scripts\activate
```

---

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

If PaddleOCR issues happen:

```bash
pip install paddlepaddle
pip install paddleocr
```

---

# Run Backend

Go to:

```bash
cd medisathi/apps/ml-api
```

Run:

```bash
uvicorn app.main:app --reload
```

Swagger docs:

```text
http://127.0.0.1:8000/docs
```

---

# OCR Flow

## Route

```text
POST /scan-prescription
```

Accepts:

* multipart/form-data
* image upload

Returns:

* raw OCR lines
* extracted medicines
* structured metadata

---

# OCR Pipeline

## Step 1 — Image Preprocessing

File:

```text
app/ocr/preprocess.py
```

Responsibilities:

* grayscale conversion
* thresholding
* denoising
* resizing

---

## Step 2 — OCR Extraction

File:

```text
app/ocr/extractor.py
```

Uses:

* PaddleOCR

Outputs:

* raw text lines

---

## Step 3 — Medicine Parsing

File:

```text
app/ocr/medicine_parser.py
```

Responsibilities:

* fuzzy medicine matching
* OCR typo normalization
* dosage extraction
* duration extraction
* frequency extraction
* food instruction extraction

Libraries:

* RapidFuzz
* regex

---

# Current Features

## Working

* OCR extraction
* fuzzy medicine matching
* dosage extraction
* food instructions
* partial frequency extraction
* partial duration extraction
* API testing
* batch image testing

---

# Known Limitations

## OCR Quality

Handwritten prescriptions are highly noisy.
Some OCR outputs may:

* merge words
* split dosage patterns
* lose frequency formatting

Examples:

```text
1-0-1 -> 10-
aftee -> after
befoce -> before
```

Current parser uses heuristic normalization.

---

## Metadata Bleeding

Nearby medicine instructions can sometimes attach to the wrong medicine.
This is caused by OCR line grouping limitations.

---

## Confidence Scores

Medicine confidence is fuzzy-match based.
Not ML probability.

---

# Current Architecture

```text
Prescription Image
        ↓
Preprocessing
        ↓
PaddleOCR
        ↓
Raw Text Lines
        ↓
Medicine Parser
        ↓
Structured JSON
```

---

# Example API Response

```json
{
  "success": true,
  "medicines": [
    {
      "matched_medicine": "Augmentin",
      "dosage": "625mg",
      "frequency": "1-0-1",
      "duration": "5 days",
      "food_instruction": "after meals"
    }
  ]
}
```

---

# Batch Testing

Images are stored in:

```text
app/ocr/data/
```

Run batch testing:

```bash
python test_all_images.py
```

---

# Recommended Future Improvements

## Better OCR

Possible upgrades:

* TrOCR
* Donut OCR
* HuggingFace medical OCR models

---

## Medicine Association

Improve mapping between:

* medicine
* dosage
* frequency
* duration

using:

* positional OCR boxes
* layout analysis
* NLP sequence tagging

---

## Frontend Features

Potential UI additions:

* medicine cards
* dosage schedule UI
* medicine reminders
* export prescription summary
* multilingual support

---

# Notes

This project is currently optimized for:

* hackathon demos
* MVP validation
* architecture demonstration

Not production clinical deployment.

---

# Main Libraries

```text
fastapi
uvicorn
opencv-python
paddleocr
paddlepaddle
rapidfuzz
pandas
numpy
```

---

# Important Commands

Run backend:

```bash
uvicorn app.main:app --reload
```

Activate venv:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Batch test:

```bash
python test_all_images.py
```
