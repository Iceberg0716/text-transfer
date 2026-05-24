FROM python:3.13-slim

WORKDIR /app

COPY server/requirements.txt /app/server/requirements.txt
RUN pip install --no-cache-dir -r /app/server/requirements.txt

COPY . /app

EXPOSE 8000

# Expect a real config at runtime:
# - mount /app/server/config.yaml, or
# - create it from config.example.yaml
CMD ["python", "-m", "uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8000"]

