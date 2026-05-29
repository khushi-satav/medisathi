"""
Medicine Name Extractor — Intelligent extraction of medicine names, dosages, and frequencies
from OCR text using vocabulary matching and pattern recognition.
"""

import re
import os
from typing import List, Dict, Optional


# Common dosage forms
DOSAGE_FORMS = {
    'tablet': ['tablet', 'tab', 'tabs', 'tablat', 'tablt'],
    'capsule': ['capsule', 'cap', 'caps', 'capsul'],
    'syrup': ['syrup', 'syp', 'syr', 'sirup'],
    'injection': ['injection', 'inj', 'inject'],
    'cream': ['cream', 'crm', 'ointment', 'oint'],
    'drops': ['drops', 'drop', 'drp', 'drps'],
    'inhaler': ['inhaler', 'inh', 'inhalr'],
    'suspension': ['suspension', 'susp'],
    'gel': ['gel'],
    'lotion': ['lotion', 'lot'],
    'powder': ['powder', 'pwd'],
    'spray': ['spray', 'spr'],
}

# Frequency patterns (Hindi/English mix common in Indian prescriptions)
FREQUENCY_PATTERNS = {
    'once_daily': [r'1\s*[-x×]\s*1', r'od\b', r'once\s*daily', r'once\s*a\s*day', r'qd\b'],
    'twice_daily': [r'1\s*[-x×]\s*2', r'bd\b', r'bid\b', r'twice\s*daily', r'twice\s*a\s*day'],
    'thrice_daily': [r'1\s*[-x×]\s*3', r'tid\b', r'tds\b', r'thrice\s*daily', r'three\s*times'],
    'four_daily': [r'1\s*[-x×]\s*4', r'qid\b', r'qds\b', r'four\s*times'],
    'before_food': [r'bf\b', r'ac\b', r'before\s*(food|meal|eating)'],
    'after_food': [r'af\b', r'pc\b', r'after\s*(food|meal|eating)'],
    'at_bedtime': [r'hs\b', r'at\s*bedtime', r'at\s*night', r'nocte'],
    'sos': [r'sos\b', r'prn\b', r'as\s*needed', r'when\s*needed'],
    'stat': [r'stat\b', r'immediately'],
}

# Dosage unit patterns  
DOSAGE_PATTERN = re.compile(
    r'(\d+\.?\d*)\s*(mg|ml|mcg|g|gm|iu|unit|units|cc|drops|puffs?)\b',
    re.IGNORECASE
)

# Duration patterns
DURATION_PATTERN = re.compile(
    r'(?:for\s+)?(\d+)\s*(day|days|week|weeks|month|months|d|w|m)\b',
    re.IGNORECASE
)


class MedicineExtractor:
    """Extract structured medicine information from OCR text."""
    
    def __init__(self, medicine_vocab_path: Optional[str] = None):
        self.medicine_names = set()
        self.medical_terms = set()
        
        if medicine_vocab_path and os.path.exists(medicine_vocab_path):
            self._load_vocabulary(medicine_vocab_path)
    
    def _load_vocabulary(self, filepath: str):
        """Load medicine names from vocabulary file."""
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    name = line.strip().lower()
                    if name and len(name) >= 3:
                        self.medicine_names.add(name)
            print(f"  💊 Loaded {len(self.medicine_names):,} medicine names")
        except Exception as e:
            print(f"  ⚠️ Failed to load vocabulary: {e}")
    
    def load_medical_terms(self, filepath: str):
        """Load medical terms vocabulary."""
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    term = line.strip().lower()
                    if term and len(term) >= 3:
                        self.medical_terms.add(term)
            print(f"  🏥 Loaded {len(self.medical_terms):,} medical terms")
        except Exception as e:
            print(f"  ⚠️ Failed to load medical terms: {e}")
    
    def _detect_dosage_form(self, text: str) -> Optional[str]:
        """Detect the dosage form (tablet, capsule, syrup, etc.)."""
        text_lower = text.lower()
        for form, keywords in DOSAGE_FORMS.items():
            for kw in keywords:
                if kw in text_lower:
                    return form
        return None
    
    def _extract_dosage(self, text: str) -> Optional[str]:
        """Extract dosage amount (e.g., '500mg', '5ml')."""
        match = DOSAGE_PATTERN.search(text)
        if match:
            return f"{match.group(1)}{match.group(2).lower()}"
        return None
    
    def _extract_frequency(self, text: str) -> Optional[str]:
        """Extract frequency/timing information."""
        text_lower = text.lower()
        for freq_name, patterns in FREQUENCY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return freq_name
        return None
    
    def _extract_duration(self, text: str) -> Optional[str]:
        """Extract duration information."""
        match = DURATION_PATTERN.search(text)
        if match:
            num = match.group(1)
            unit = match.group(2).lower()
            if unit in ('d', 'day', 'days'):
                return f"{num} days"
            elif unit in ('w', 'week', 'weeks'):
                return f"{num} weeks"
            elif unit in ('m', 'month', 'months'):
                return f"{num} months"
        return None
    
    def _is_likely_medicine(self, text: str) -> bool:
        """Check if text is likely a medicine name."""
        text_lower = text.lower().strip()
        
        # Check against vocabulary
        if text_lower in self.medicine_names:
            return True
        
        # Check partial matches (medicine names with dosage appended)
        for name in self.medicine_names:
            if name in text_lower or text_lower in name:
                if len(text_lower) >= 4:  # Avoid false positives
                    return True
        
        # Heuristic: contains dosage keywords
        dosage_indicators = ['mg', 'ml', 'mcg', 'tab', 'cap', 'syp', 'inj']
        if any(ind in text_lower for ind in dosage_indicators):
            return True
        
        return False
    
    def extract_medicines(self, ocr_lines: List[str]) -> List[Dict]:
        """
        Extract structured medicine information from OCR text lines.
        
        Returns list of dicts with keys:
        - name: Medicine name
        - dosage: Dosage amount (e.g., "500mg")
        - form: Dosage form (tablet, capsule, etc.)
        - frequency: How often to take
        - duration: For how long
        - confidence: Confidence score
        - raw_text: Original OCR text
        """
        medicines = []
        context_window = []
        
        for i, line in enumerate(ocr_lines):
            line = line.strip()
            if not line or len(line) < 2:
                continue
            
            # Build context from nearby lines
            context = ' '.join(ocr_lines[max(0, i-1):min(len(ocr_lines), i+2)])
            
            # Check if this line or context contains medicine information
            is_med = self._is_likely_medicine(line)
            dosage = self._extract_dosage(line) or self._extract_dosage(context)
            form = self._detect_dosage_form(line) or self._detect_dosage_form(context)
            frequency = self._extract_frequency(line) or self._extract_frequency(context)
            duration = self._extract_duration(context)
            
            if is_med or dosage or form:
                # Try to extract clean medicine name
                med_name = line
                
                # Remove dosage info from name
                if dosage:
                    med_name = DOSAGE_PATTERN.sub('', med_name).strip()
                
                # Remove form keywords from name
                if form:
                    for kw in DOSAGE_FORMS.get(form, []):
                        med_name = re.sub(r'\b' + re.escape(kw) + r'\b', '', med_name, flags=re.IGNORECASE).strip()
                
                # Clean up
                med_name = re.sub(r'\s+', ' ', med_name).strip()
                med_name = re.sub(r'^[-–—\s]+|[-–—\s]+$', '', med_name)
                
                if med_name and len(med_name) >= 2:
                    # Calculate confidence
                    confidence = 0.5
                    if med_name.lower() in self.medicine_names:
                        confidence = 0.95
                    elif dosage:
                        confidence += 0.2
                    if form:
                        confidence += 0.15
                    if frequency:
                        confidence += 0.1
                    confidence = min(confidence, 0.99)
                    
                    medicines.append({
                        'name': med_name,
                        'dosage': dosage or '',
                        'form': form or 'unknown',
                        'frequency': frequency or '',
                        'duration': duration or '',
                        'confidence': round(confidence, 2),
                        'raw_text': line,
                    })
        
        # Deduplicate by name similarity
        medicines = self._deduplicate(medicines)
        
        return medicines
    
    def _deduplicate(self, medicines: List[Dict]) -> List[Dict]:
        """Remove duplicate medicine entries."""
        seen_names = set()
        unique = []
        for med in medicines:
            name_key = re.sub(r'[^a-z]', '', med['name'].lower())
            if name_key not in seen_names and len(name_key) >= 2:
                seen_names.add(name_key)
                unique.append(med)
        return unique
