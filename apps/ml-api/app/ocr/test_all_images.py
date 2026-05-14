import os
import requests
import json


API_URL = "http://127.0.0.1:8000/scan-prescription"

DATA_FOLDER = "data"


total_images = 0
successful_scans = 0


for filename in os.listdir(DATA_FOLDER):

    if not filename.lower().endswith(
        (".png", ".jpg", ".jpeg")
    ):
        continue

    total_images += 1

    file_path = os.path.join(
        DATA_FOLDER,
        filename
    )

    print("\n" + "=" * 60)
    print("TESTING:", filename)
    print("=" * 60)

    try:

        with open(file_path, "rb") as f:

            files = {
                "file": (
                    filename,
                    f,
                    "image/jpeg"
                )
            }

            response = requests.post(
                API_URL,
                files=files,
                timeout=60
            )

        print("STATUS:", response.status_code)

        if response.status_code != 200:
            continue

        data = response.json()

        medicines = data.get(
            "medicines",
            []
        )

        if medicines:
            successful_scans += 1

        print("\nMEDICINES FOUND:")

        for med in medicines:

            print(
                f"- {med['matched_medicine']}"
            )

            print(
                f"  dosage: {med.get('dosage')}"
            )

            print(
                f"  frequency: {med.get('frequency')}"
            )

            print(
                f"  duration: {med.get('duration')}"
            )

            print(
                f"  food: {med.get('food_instruction')}"
            )

            print()

    except Exception as e:

        print("ERROR:", e)


print("\n" + "=" * 60)
print("FINAL RESULTS")
print("=" * 60)

print(
    f"Processed Images: {total_images}"
)

print(
    f"Successful Medicine Detections: {successful_scans}"
)

accuracy = (
    successful_scans / total_images * 100
    if total_images > 0 else 0
)

print(
    f"Detection Rate: {accuracy:.2f}%"
)