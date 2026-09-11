import json
import os
from backend.app.main import app

def export_schema():
    os.makedirs("contracts", exist_ok=True)
    schema = app.openapi()
    with open("contracts/openapi.json", "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2)
    print("SUCCESS: OpenAPI v3 schema exported successfully to contracts/openapi.json")

if __name__ == "__main__":
    export_schema()
