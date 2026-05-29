import os
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"

from paddleocr import PaddleOCR

ocr = PaddleOCR(
    use_textline_orientation=True,
    lang='en'
)

def extract_text(image):

    result = ocr.ocr(image)

    print("========== RAW OCR RESULT ==========")
    print(result)
    print("====================================")

    extracted = []

    try:

        if result and len(result) > 0:

            page = result[0]

            if isinstance(page, dict):
                texts = page.get("rec_texts", [])
                scores = page.get("rec_scores", [])

                for text, score in zip(texts, scores):

                    print("TEXT:", text)
                    print("SCORE:", score)

                    if score > 0.3:
                        extracted.append(text)
            elif isinstance(page, list):
                for line in page:
                    if isinstance(line, list) and len(line) > 1 and isinstance(line[1], tuple):
                        text, score = line[1]
                        print("TEXT:", text)
                        print("SCORE:", score)
                        if score > 0.3:
                            extracted.append(text)

    except Exception as e:

        print("OCR PARSING ERROR:", e)

    return extracted