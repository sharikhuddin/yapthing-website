#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT=yapthing
REGION=us-central1
JOB=yapcode-internal-verify
REPO=yapcode-internal
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/verifier:internal-v1"
echo "INTERNAL TEST ONLY. Requires Google Cloud billing. This can incur charges."
echo "Confirm the selected project, billing budget, and quotas before continuing."
gcloud config set project "$PROJECT"
gcloud auth list --filter='status:ACTIVE' --format='value(account)'
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
if ! gcloud artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPO" --location="$REGION" --repository-format=docker --description="YapCode internal verification only"
fi
gcloud builds submit . --config=deploy/cloud-run/cloudbuild.yaml --substitutions="_IMAGE=$IMAGE"
gcloud run jobs deploy "$JOB" --image="$IMAGE" --region="$REGION" --tasks=1 --parallelism=1 --max-retries=0 --task-timeout=120s --memory=512Mi --cpu=1 --set-env-vars=YAPCODE_TIMEOUT_MS=60000
echo "Job deployed; no scheduled execution was configured."
echo "To run exactly one internal test:"
echo "gcloud run jobs execute $JOB --region=$REGION --wait"
