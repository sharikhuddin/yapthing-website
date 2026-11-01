#!/usr/bin/env bash
# Read-only deployment audit. Never creates, executes, or schedules jobs.
set -Eeuo pipefail
PROJECT="${YAPCODE_PROJECT:-yapthing}"
REGION="${YAPCODE_REGION:-us-central1}"
JOB="${YAPCODE_JOB:-yapcode-internal-verify}"
for required in gcloud; do command -v "$required" >/dev/null || { echo "Missing $required" >&2; exit 2; }; done
printf 'Project: %s\nRegion: %s\nJob: %s\n' "$PROJECT" "$REGION" "$JOB"
printf '\nCloud Run job configuration:\n'
gcloud run jobs describe "$JOB" --project="$PROJECT" --region="$REGION" --format='yaml(metadata.name,spec.template.spec.template.spec.containers,spec.template.spec.template.spec.maxRetries,spec.template.spec.parallelism,spec.template.spec.taskCount)' || { echo 'Job inaccessible or not deployed.' >&2; exit 1; }
printf '\nLatest executions (read-only):\n'
gcloud run jobs executions list --job="$JOB" --project="$PROJECT" --region="$REGION" --limit=5 --format='table(metadata.name,status.succeededCount,status.failedCount,status.runningCount,metadata.creationTimestamp)'
printf '\nCloud Build latest (read-only):\n'
gcloud builds list --project="$PROJECT" --limit=3 --format='table(id,status,createTime)' || true
printf '\nCOST WARNING: This audit does not inspect real bills. Check Cloud Billing budgets and usage separately.\n'
