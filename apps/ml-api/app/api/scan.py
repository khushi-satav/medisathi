"""
Scan Prescription API Route
=============================
Handles prescription image upload and OCR processing.
"""

import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.ocr.medicine_parser import parse_medicines
import numpy as np
import cv2

from app.ocr.extractor import extract_text

logger = logging.getLogger(__name__)

router = APIRouter(tags=["OCR"])


@router.post("/scan-prescription")
async def scan_prescription(file: UploadFile = File(...)):
    """
    Scan a prescription image and extract medicines.
    """

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Expected an image file, got: {file.content_type}",
        )

    try:

        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Empty file uploaded"
            )

        logger.info(
            f"Processing prescription: {file.filename} ({len(contents)} bytes)"
        )

        # Decode image
        npimg = np.frombuffer(contents, np.uint8)

        image = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(
                status_code=400,
                detail="Could not decode uploaded image"
            )

        # OCR extraction
        raw_lines = extract_text(image)

        print("RAW OCR LINES:")
        print(raw_lines)

        # No text found
        if not raw_lines:

            logger.warning(f"No text detected in {file.filename}")

            return {
                "success": True,
                "raw_text": [],
                "medicines": [],
                "message": "No text could be detected."
            }

        # Temporary: medicines disabled during debugging
        medicines = parse_medicines(raw_lines)

        logger.info(
            f"Scan complete: {len(raw_lines)} text lines"
        )

        return {
            "success": True,
            "raw_text": raw_lines,
            "medicines": medicines,
            "total_lines": len(raw_lines),
            "total_medicines": len(medicines),
        }

    except HTTPException:
        raise

    except Exception as e:

        logger.exception(f"Prescription scan failed: {e}")

        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}",
        )