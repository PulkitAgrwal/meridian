#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# ChainSight — Setup GCP Secret Manager secrets from .env
# ═══════════════════════════════════════════════════════════════════
#
# Usage:
#   ./setup-secrets.sh              # Uses .env in current directory
#   ./setup-secrets.sh /path/.env   # Uses specified env file
#
# This script reads API keys from a .env file and stores them in
# Google Cloud Secret Manager. Run once before the first deploy,
# or whenever keys change.
# ═══════════════════════════════════════════════════════════════════

PROJECT_ID="${FIREBASE_PROJECT_ID:-chainsight-40326}"
ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found."
    echo "Copy .env.example to .env and fill in your API keys first."
    exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo " ChainSight — Secret Manager Setup"
echo " Project: $PROJECT_ID"
echo " Source:  $ENV_FILE"
echo "═══════════════════════════════════════════════════════"
echo ""

# Pre-flight
command -v gcloud >/dev/null 2>&1 || { echo "ERROR: gcloud CLI not found."; exit 1; }
gcloud config set project "$PROJECT_ID" --quiet

# Enable Secret Manager API
echo "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --quiet

# Secrets to store
SECRETS=(
    "GOOGLE_API_KEY"
    "AISSTREAM_API_KEY"
    "OPENWEATHER_API_KEY"
    "GOOGLE_MAPS_API_KEY"
)

echo ""
echo "Storing secrets..."

STORED=0
SKIPPED=0

for secret_name in "${SECRETS[@]}"; do
    # Extract value from .env file
    value=$(grep "^${secret_name}=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

    if [ -z "$value" ]; then
        echo "  SKIP  $secret_name (not set in $ENV_FILE)"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # Create secret if it doesn't exist
    if ! gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
        gcloud secrets create "$secret_name" \
            --replication-policy="automatic" \
            --project="$PROJECT_ID" \
            --quiet
        echo "  NEW   $secret_name (created + stored)"
    else
        echo "  UPDATE $secret_name (new version added)"
    fi

    # Add new secret version
    echo -n "$value" | gcloud secrets versions add "$secret_name" \
        --data-file=- \
        --project="$PROJECT_ID" \
        --quiet

    STORED=$((STORED + 1))
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo " Done: $STORED stored, $SKIPPED skipped"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Grant Cloud Run service account access to secrets:"
echo "     PROJECT_NUM=\$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')"
echo "     for secret in ${SECRETS[*]}; do"
echo "       gcloud secrets add-iam-policy-binding \$secret \\"
echo "         --member=\"serviceAccount:\${PROJECT_NUM}-compute@developer.gserviceaccount.com\" \\"
echo "         --role=\"roles/secretmanager.secretAccessor\" \\"
echo "         --project=\"$PROJECT_ID\""
echo "     done"
echo "  2. Run ./deploy.sh to deploy all agents"
echo ""
