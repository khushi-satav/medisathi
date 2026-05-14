import cv2

def preprocess_image(image):

    # Resize
    height, width = image.shape[:2]

    max_dim = 1200

    if max(height, width) > max_dim:

        scale = max_dim / max(height, width)

        image = cv2.resize(
            image,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_AREA
        )

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Improve contrast
    gray = cv2.equalizeHist(gray)

    # Mild denoise
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    # Convert back to 3-channel
    processed = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

    return processed