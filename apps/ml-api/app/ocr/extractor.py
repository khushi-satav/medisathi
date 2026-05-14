from paddleocr import PaddleOCR

ocr = PaddleOCR(
    use_angle_cls=False,
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

            texts = page.get("rec_texts", [])
            scores = page.get("rec_scores", [])

            for text, score in zip(texts, scores):

                print("TEXT:", text)
                print("SCORE:", score)

                if score > 0.3:
                    extracted.append(text)

    except Exception as e:

        print("OCR PARSING ERROR:", e)

    return extracted