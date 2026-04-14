#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# ChainSight — Deploy to Google Cloud Run + Firebase Hosting
# ═══════════════════════════════════════════════════════════════════

PROJECT_ID="${FIREBASE_PROJECT_ID:-chainsight-40326}"
REGION="asia-south1"
REPO="chainsight"
AGENTS=("sentinel" "analyst" "optimizer" "communicator" "orchestrator")

echo "═══════════════════════════════════════════════════════"
echo " ChainSight Deploy"
echo " Project: $PROJECT_ID | Region: $REGION"
echo "═══════════════════════════════════════════════════════"

# ── Pre-flight checks ──
command -v gcloud >/dev/null 2>&1 || { echo "ERROR: gcloud CLI not found. Install from https://cloud.google.com/sdk/docs/install"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not found."; exit 1; }

# Set project
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo ""
echo "1. Enabling required APIs..."
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com \
    --quiet

# Create Artifact Registry repo if it doesn't exist
echo ""
echo "2. Setting up Artifact Registry..."
gcloud artifacts repositories describe "$REPO" \
    --location="$REGION" 2>/dev/null || \
gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="ChainSight agent images"

# Configure Docker auth
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ── Store secrets ──
echo ""
echo "3. Storing API keys in Secret Manager..."
for secret_name in GOOGLE_API_KEY AISSTREAM_API_KEY OPENWEATHER_API_KEY GOOGLE_MAPS_API_KEY; do
    value=$(grep "^${secret_name}=" .env | cut -d'=' -f2-)
    if [ -n "$value" ]; then
        # Create secret if it doesn't exist, then add version
        gcloud secrets describe "$secret_name" --project="$PROJECT_ID" 2>/dev/null || \
            gcloud secrets create "$secret_name" --replication-policy="automatic" --project="$PROJECT_ID"
        echo -n "$value" | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID"
        echo "   Stored $secret_name"
    fi
done

# ── Build and push images ──
IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"
echo ""
echo "4. Building and pushing Docker images..."

for agent in "${AGENTS[@]}"; do
    IMAGE="${IMAGE_BASE}/chainsight-${agent}:latest"
    echo "   Building chainsight-${agent}..."
    docker build -t "$IMAGE" -f "Dockerfile.${agent}" .
    echo "   Pushing chainsight-${agent}..."
    docker push "$IMAGE"
done

# ── Deploy specialist agents first ──
echo ""
echo "5. Deploying specialist agents to Cloud Run..."

GEMINI_MODEL=$(grep "^GEMINI_MODEL=" .env | cut -d'=' -f2- || echo "gemini-2.0-flash")

declare -A SERVICE_URLS

for agent in sentinel analyst optimizer communicator; do
    IMAGE="${IMAGE_BASE}/chainsight-${agent}:latest"
    SERVICE="chainsight-${agent}"
    echo "   Deploying ${SERVICE}..."
    gcloud run deploy "$SERVICE" \
        --image "$IMAGE" \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --min-instances=1 \
        --max-instances=3 \
        --memory=512Mi \
        --cpu=1 \
        --timeout=300 \
        --set-env-vars="GEMINI_MODEL=${GEMINI_MODEL}" \
        --set-secrets="GOOGLE_API_KEY=GOOGLE_API_KEY:latest,AISSTREAM_API_KEY=AISSTREAM_API_KEY:latest,OPENWEATHER_API_KEY=OPENWEATHER_API_KEY:latest" \
        --quiet

    URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
    SERVICE_URLS[$agent]="$URL"
    echo "   ${SERVICE}: ${URL}"
done

# ── Deploy orchestrator with specialist URLs ──
echo ""
echo "6. Deploying orchestrator..."
IMAGE="${IMAGE_BASE}/chainsight-orchestrator:latest"
gcloud run deploy "chainsight-orchestrator" \
    --image "$IMAGE" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --min-instances=1 \
    --max-instances=5 \
    --memory=1Gi \
    --cpu=1 \
    --timeout=300 \
    --set-env-vars="GEMINI_MODEL=${GEMINI_MODEL},SENTINEL_URL=${SERVICE_URLS[sentinel]},ANALYST_URL=${SERVICE_URLS[analyst]},OPTIMIZER_URL=${SERVICE_URLS[optimizer]},COMMUNICATOR_URL=${SERVICE_URLS[communicator]}" \
    --set-secrets="GOOGLE_API_KEY=GOOGLE_API_KEY:latest,AISSTREAM_API_KEY=AISSTREAM_API_KEY:latest,OPENWEATHER_API_KEY=OPENWEATHER_API_KEY:latest" \
    --quiet

ORCHESTRATOR_URL=$(gcloud run services describe "chainsight-orchestrator" --region "$REGION" --format='value(status.url)')
echo "   Orchestrator: ${ORCHESTRATOR_URL}"

# ── Deploy frontend to Firebase Hosting ──
echo ""
echo "7. Deploying frontend to Firebase Hosting..."

command -v firebase >/dev/null 2>&1 || { echo "   Installing Firebase CLI..."; npm install -g firebase-tools; }

cd frontend

# Set the API URL for the frontend build
echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$(grep '^GOOGLE_MAPS_API_KEY=' ../.env | cut -d'=' -f2-)" > .env.production
echo "NEXT_PUBLIC_ORCHESTRATOR_URL=${ORCHESTRATOR_URL}" >> .env.production

npm install
npm run build

cd ..

# Initialize Firebase if needed
if [ ! -f "firebase.json" ]; then
    cat > firebase.json <<FBEOF
{
  "hosting": {
    "source": "frontend",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "frameworksBackend": {
      "region": "${REGION}"
    }
  }
}
FBEOF
fi

firebase deploy --only hosting --project "$PROJECT_ID"

HOSTING_URL="https://${PROJECT_ID}.web.app"

# ── Print summary ──
echo ""
echo "═══════════════════════════════════════════════════════"
echo " DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════"
echo ""
echo " Cloud Run Services:"
echo "   Sentinel:     ${SERVICE_URLS[sentinel]}"
echo "   Analyst:      ${SERVICE_URLS[analyst]}"
echo "   Optimizer:    ${SERVICE_URLS[optimizer]}"
echo "   Communicator: ${SERVICE_URLS[communicator]}"
echo "   Orchestrator: ${ORCHESTRATOR_URL}"
echo ""
echo " Frontend:"
echo "   ${HOSTING_URL}"
echo ""
echo " API Endpoints:"
echo "   POST ${ORCHESTRATOR_URL}/api/v1/query"
echo "   GET  ${ORCHESTRATOR_URL}/api/v1/disruptions"
echo "   GET  ${ORCHESTRATOR_URL}/api/v1/reasoning"
echo "   GET  ${ORCHESTRATOR_URL}/api/v1/corridors"
echo "   GET  ${ORCHESTRATOR_URL}/health"
echo ""
echo " LIVE PROTOTYPE URL: ${HOSTING_URL}"
echo "═══════════════════════════════════════════════════════"
