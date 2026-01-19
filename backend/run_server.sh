#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
exec python -m uvicorn main:app --reload --port 9000

