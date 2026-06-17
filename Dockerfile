FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy codebase
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY app.py .
COPY .env .

EXPOSE 5000

# Start app using python app.py or uvicorn directly
CMD ["python", "app.py"]
