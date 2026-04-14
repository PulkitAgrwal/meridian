FROM python:3.12-slim

WORKDIR /app

# Install dependencies (single layer, shared by all agents)
COPY pyproject.toml .
RUN pip install --no-cache-dir \
    "google-adk[a2a]>=1.30.0" \
    "google-genai>=1.0.0" \
    "uvicorn>=0.30.0" \
    "fastapi>=0.115.0" \
    "httpx>=0.27.0" \
    "websockets>=12.0" \
    "pydantic>=2.0.0" \
    "firebase-admin>=6.0.0" \
    "feedparser>=6.0.0" \
    "networkx>=3.0" \
    "python-dotenv>=1.0.0" \
    "aiohttp>=3.9.0"

# Copy ALL application code (shared across all agents)
COPY shared/ shared/
COPY tools/ tools/
COPY data/ data/
COPY agents/ agents/

ENV PYTHONPATH=/app
ENV PORT=8080

EXPOSE 8080

# Default: orchestrator. Override per-service via Cloud Run --command flag.
CMD ["python", "-m", "uvicorn", "agents.orchestrator.server:app", "--host", "0.0.0.0", "--port", "8080"]
