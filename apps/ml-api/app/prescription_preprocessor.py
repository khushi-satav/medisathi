"""
Prescription Image Preprocessor — Ported from Model-1/Model-5
Handles page detection, perspective correction, and image enhancement
for medical prescription scanning.
"""

import cv2
import numpy as np
from typing import Optional, Tuple


def resize(img: np.ndarray, height: int = 800) -> np.ndarray:
    """Resize image to given height while maintaining aspect ratio."""
    if img.shape[0] == 0:
        return img
    rat = height / img.shape[0]
    return cv2.resize(img, (int(rat * img.shape[1]), height))


def ratio(img: np.ndarray, height: int = 800) -> float:
    """Get ratio between original image and resized image."""
    return img.shape[0] / height


def edges_detect(img: np.ndarray, min_val: int = 200, max_val: int = 250) -> np.ndarray:
    """
    Preprocessing + Canny edge detection.
    From Model-1/5: gray → bilateral filter → adaptive threshold → median blur → Canny.
    """
    gray = cv2.cvtColor(resize(img), cv2.COLOR_BGR2GRAY)
    
    # Bilateral filter preserves edges while removing noise
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    
    # Adaptive threshold for varying lighting conditions
    gray = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 115, 4
    )
    
    # Median blur removes thin details/noise
    gray = cv2.medianBlur(gray, 11)
    
    # Add black border so contours don't touch image edges
    gray = cv2.copyMakeBorder(gray, 5, 5, 5, 5, cv2.BORDER_CONSTANT, value=[0, 0, 0])
    
    return cv2.Canny(gray, min_val, max_val)


def four_corners_sort(pts: np.ndarray) -> np.ndarray:
    """Sort corners: top-left, bot-left, bot-right, top-right."""
    diff = np.diff(pts, axis=1)
    summ = pts.sum(axis=1)
    return np.array([
        pts[np.argmin(summ)],
        pts[np.argmax(diff)],
        pts[np.argmax(summ)],
        pts[np.argmin(diff)]
    ])


def contour_offset(cnt: np.ndarray, offset: tuple) -> np.ndarray:
    """Offset contour because of border padding."""
    cnt = cnt + offset
    cnt[cnt < 0] = 0
    return cnt


def find_page_contours(edges: np.ndarray, img: np.ndarray) -> np.ndarray:
    """Find the page contour (largest rectangular contour)."""
    # Handle different OpenCV versions
    contour_result = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = contour_result[-2]  # Works for both OpenCV 3 and 4
    
    height, width = edges.shape[:2]
    min_contour_area = height * width * 0.5
    max_contour_area = (width - 10) * (height - 10)
    
    max_area = min_contour_area
    page_contour = np.array([[0, 0], [0, height], [width, height], [width, 0]])
    
    for cnt in contours:
        perimeter = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.03 * perimeter, True)
        
        if (len(approx) == 4 and cv2.isContourConvex(approx) and
                max_area < cv2.contourArea(approx) < max_contour_area):
            max_area = cv2.contourArea(approx)
            page_contour = approx
    
    page_contour = four_corners_sort(page_contour[:, 0] if len(page_contour.shape) == 3 else page_contour)
    return contour_offset(page_contour, (-5, -5))


def perspective_transform(img: np.ndarray, src_points: np.ndarray) -> np.ndarray:
    """Transform perspective from source points to rectangular target."""
    height = max(
        np.linalg.norm(src_points[0] - src_points[1]),
        np.linalg.norm(src_points[2] - src_points[3])
    )
    width = max(
        np.linalg.norm(src_points[1] - src_points[2]),
        np.linalg.norm(src_points[3] - src_points[0])
    )
    
    target_points = np.array([
        [0, 0], [0, height], [width, height], [width, 0]
    ], np.float32)
    
    if src_points.dtype != np.float32:
        src_points = src_points.astype(np.float32)
    
    M = cv2.getPerspectiveTransform(src_points, target_points)
    return cv2.warpPerspective(img, M, (int(width), int(height)))


def enhance_contrast(img: np.ndarray) -> np.ndarray:
    """Enhance image contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)."""
    if len(img.shape) == 3:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l_channel, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_channel = clahe.apply(l_channel)
        lab = cv2.merge((l_channel, a, b))
        return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    else:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(img)


def denoise(img: np.ndarray) -> np.ndarray:
    """Remove noise while preserving text edges."""
    if len(img.shape) == 3:
        return cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
    else:
        return cv2.fastNlMeansDenoising(img, None, 10, 7, 21)


def sharpen(img: np.ndarray) -> np.ndarray:
    """Sharpen the image to make text clearer."""
    kernel = np.array([[-1, -1, -1],
                       [-1,  9, -1],
                       [-1, -1, -1]])
    return cv2.filter2D(img, -1, kernel)


def binarize(img: np.ndarray) -> np.ndarray:
    """Convert to binary image using adaptive thresholding."""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    return cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )


def deskew(img: np.ndarray) -> np.ndarray:
    """Correct image skew/rotation."""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()
    
    # Threshold
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    
    # Find coordinates of all non-zero pixels
    coords = np.column_stack(np.where(thresh > 0))
    
    if len(coords) < 10:
        return img
    
    # Get the minimum area rectangle
    angle = cv2.minAreaRect(coords)[-1]
    
    # Correct the angle
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    
    # Only deskew if angle is significant but not too large
    if abs(angle) > 0.5 and abs(angle) < 15:
        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC,
                              borderMode=cv2.BORDER_REPLICATE)
    
    return img


def preprocess_prescription(img: np.ndarray, 
                            do_page_detection: bool = True,
                            do_deskew: bool = True,
                            do_enhance: bool = True,
                            do_denoise: bool = True) -> np.ndarray:
    """
    Full preprocessing pipeline for prescription images.
    Combines all preprocessing steps from Model-1 and Model-5.
    
    Pipeline:
    1. Page detection & perspective correction (optional)
    2. Deskew (optional)
    3. Contrast enhancement (optional)
    4. Denoising (optional)
    
    Args:
        img: Input image (BGR format)
        do_page_detection: Whether to detect and crop page
        do_deskew: Whether to correct skew
        do_enhance: Whether to enhance contrast
        do_denoise: Whether to apply denoising
    
    Returns:
        Preprocessed image
    """
    result = img.copy()
    
    # Step 1: Page detection & perspective correction
    if do_page_detection:
        try:
            edges = edges_detect(result, 200, 250)
            closed_edges = cv2.morphologyEx(
                edges, cv2.MORPH_CLOSE, np.ones((5, 11))
            )
            page_contour = find_page_contours(closed_edges, resize(result))
            page_contour = page_contour.dot(ratio(result))
            
            # Only apply if contour is significantly different from full image
            h, w = result.shape[:2]
            contour_area = cv2.contourArea(page_contour.astype(np.float32))
            image_area = h * w
            
            if 0.3 < contour_area / image_area < 0.95:
                result = perspective_transform(result, page_contour)
        except Exception as e:
            print(f"  ⚠️ Page detection skipped: {e}")
    
    # Step 2: Deskew
    if do_deskew:
        try:
            result = deskew(result)
        except Exception as e:
            print(f"  ⚠️ Deskew skipped: {e}")
    
    # Step 3: Contrast enhancement
    if do_enhance:
        try:
            result = enhance_contrast(result)
        except Exception as e:
            print(f"  ⚠️ Enhancement skipped: {e}")
    
    # Step 4: Denoising
    if do_denoise:
        try:
            result = denoise(result)
        except Exception as e:
            print(f"  ⚠️ Denoising skipped: {e}")
    
    return result
