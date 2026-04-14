Deploy ChainSight to Google Cloud Run + Firebase Hosting.

## Architecture
- Each agent = 1 Cloud Run service (5 total)
- Frontend = Firebase Hosting (static Next.js export)
- Firestore = real-time state database
- Secret Manager = API keys

## Dockerfile Pattern (per agent)
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
COPY shared/ shared/
COPY tools/ tools/
COPY data/ data/
COPY agents/<AGENT_NAME>/ agents/<AGENT_NAME>/
RUN pip install "google-adk[a2a]" google-genai uvicorn fastapi httpx websockets pydantic firebase-admin feedparser networkx python-dotenv aiohttp
ENV PORT=8080
CMD ["python", "-m", "agents.<AGENT_NAME>.server"]
```

## Critical Deploy Notes
- Cloud Run injects PORT env var — agent server.py must read it: `int(os.environ.get("PORT", 8081))`
- Set `GOOGLE_GENAI_USE_VERTEXAI=True` in Cloud Run env vars
- Agent Card URLs must use Cloud Run service URLs (e.g., `https://chainsight-sentinel-xxxxx.run.app`)
- Update orchestrator's RemoteA2aAgent URLs to Cloud Run URLs
- Set `--min-instances=1` on all services to avoid cold start during demo
- Store API keys in Secret Manager, mount as env vars in Cloud Run

## Deploy Commands
```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/chainsight-sentinel agents/sentinel/
gcloud run deploy chainsight-sentinel --image gcr.io/PROJECT_ID/chainsight-sentinel --region asia-south1

# Frontend
cd frontend && npm run build && firebase deploy --only hosting
```

$ARGUMENTS
