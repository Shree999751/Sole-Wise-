import uvicorn
import os
import sys

if __name__ == "__main__":
    print("=" * 65)
    print("  SHOES WISE - Footwear Material & Cost Optimization Platform")
    print("=" * 65)
    print("  Backend API:  http://127.0.0.1:8000/api")
    print("  Interactive:  http://127.0.0.1:8000")
    print("  API Docs:     http://127.0.0.1:8000/docs")
    print("=" * 65)
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=False)
