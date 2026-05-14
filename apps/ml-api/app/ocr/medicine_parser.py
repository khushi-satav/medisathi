from rapidfuzz import process, fuzz
import pandas as pd
import re


medicine_df = pd.read_csv("datasets/medications.csv")

medicine_list = medicine_df["name"].dropna().tolist()


FOOD_INSTRUCTIONS = [
    "after food",
    "before food",
    "after meals",
    "before meals",
    "empty stomach",
    "with food",
]


FREQUENCY_KEYWORDS = [
    "od",
    "bd",
    "tds",
    "sos",
]


SHORTCUT_MAP = {
    "od": "Once Daily",
    "bd": "Twice Daily",
    "tds": "Three Times Daily",
    "sos": "As Needed",
}


def clean_text(text):

    text = text.lower()

    text = text.replace(".", "")
    text = text.replace(",", "")

    replacements = {

        # OCR typo cleanup
        "aftee": "after",
        "befoce": "before",

        "xsdays": "5 days",
        "x5days": "5 days",

        "xiweek": "1 week",
        "x1week": "1 week",

        "homg": "40mg",

        "painit": "paint",

        "dinity": "daily",

        "pand": "pan d",

        # OCR frequency fixes
        "10-": "1-0-1",
        "1-0": "1-0-1",
        "1o-": "1-0-1",
        "101": "1-0-1",

        # OCR dosage fixes
        "625ma": "625mg",
        "40ma": "40mg",
    }

    for wrong, correct in replacements.items():

        text = text.replace(wrong, correct)

    return text


def merge_lines(text_lines):

    merged = []

    skip = False

    for i in range(len(text_lines)):

        if skip:
            skip = False
            continue

        current = text_lines[i]

        if i + 1 < len(text_lines):

            next_line = text_lines[i + 1]

            combined = current + " " + next_line

            lower_combined = clean_text(combined)

            if (
                "after meals" in lower_combined
                or "before meals" in lower_combined
            ):

                merged.append(combined)

                skip = True

                continue

        merged.append(current)

    return merged


def extract_frequency(text):

    compact = re.sub(r'\s+', '', text)

    replacements = {
        "10-": "1-0-1",
        "1-0": "1-0-1",
        "1o-": "1-0-1",
        "101": "1-0-1",
        "111": "1-1-1",
        "100": "1-0-0",
        "010": "0-1-0",
        "001": "0-0-1",
    }

    for wrong, correct in replacements.items():

        compact = compact.replace(
            wrong,
            correct
        )

    patterns = [
        "1-0-1",
        "1-1-1",
        "1-0-0",
        "0-1-0",
        "0-0-1",
    ]

    for pattern in patterns:

        if pattern in compact:
            return pattern

    return None


def parse_medicines(text_lines):

    text_lines = merge_lines(text_lines)

    medicines = []

    for i, text in enumerate(text_lines):

        context_lines = []

        for j in range(i, min(i + 12, len(text_lines))):

            line = text_lines[j]

            # stop when another medicine starts
            if (
                j > i
                and (
                    line.lower().startswith("tab")
                    or line.lower().startswith("cap")
                    or line.lower().startswith("syr")
                )
                and len(context_lines) > 4
            ):
                break

            context_lines.append(line)

        nearby_text = clean_text(
            " ".join(context_lines)
        )

        # Clean current line
        cleaned_text = clean_text(text)

        cleaned_text = re.sub(
            r'[^a-zA-Z0-9\s-]',
            '',
            cleaned_text
        )

        # Remove dosage before matching
        cleaned_text = re.sub(
            r'\d+\s?(mg|ml|gm)',
            '',
            cleaned_text
        )

        # Remove medicine prefixes safely
        prefixes = [
            "tab",
            "tablet",
            "cap",
            "capsule",
            "syrup",
            "inj",
        ]

        for prefix in prefixes:

            cleaned_text = re.sub(
                rf'\b{prefix}\b',
                '',
                cleaned_text
            )

        cleaned_text = cleaned_text.strip()

        print("FINAL CLEANED:", cleaned_text)

        # Only process likely medicine lines
        medicine_keywords = [
            "tab",
            "cap",
            "syrup",
            "inj",
            "tablet",
            "capsule",
        ]

        is_medicine_line = any(
            keyword in text.lower()
            for keyword in medicine_keywords
        )

        if not is_medicine_line:
            continue

        # Fuzzy matching
        match = process.extractOne(
            cleaned_text,
            medicine_list,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=60
        )

        print("TEXT:", cleaned_text)
        print("MATCH:", match)

        if not match:
            continue

        # Reject tiny noisy matches
        if len(cleaned_text) < 3:
            continue

        medicine_name = match[0]

        confidence = round(match[1], 2)

        confidence_label = "high"

        if confidence < 90:
            confidence_label = "medium"

        if confidence < 80:
            confidence_label = "low"

        # Food instruction
        food_instruction = None

        for instruction in FOOD_INSTRUCTIONS:

            if instruction in nearby_text:

                food_instruction = instruction
                break

        # Frequency
        frequency = extract_frequency(
            nearby_text
        )

        if not frequency:

            for freq in FREQUENCY_KEYWORDS:

                if freq in nearby_text:

                    frequency = SHORTCUT_MAP.get(
                        freq,
                        freq
                    )

                    break

        # Dosage
        dosage = None

        dosage_match = re.search(
            r'(\d+\s?(mg|ml|gm))',
            text.lower()
        )

        if dosage_match:

            dosage = dosage_match.group(1)

        # Duration
        duration = None

        duration_patterns = {
            "5 days": "5 days",
            "7 days": "7 days",
            "1 week": "1 week",
            "2 weeks": "2 weeks",
        }

        for pattern, normalized in duration_patterns.items():

            if pattern in nearby_text:

                duration = normalized
                break

        medicines.append({

            "detected_text": text,

            "matched_medicine": medicine_name,

            "confidence": confidence,

            "confidence_label": confidence_label,

            "dosage": dosage,

            "frequency": frequency,

            "duration": duration,

            "food_instruction": food_instruction,
        })

    return medicines