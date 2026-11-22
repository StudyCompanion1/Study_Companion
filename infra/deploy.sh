#!/usr/bin/env bash
# Runs ON THE EC2 INSTANCE (invoked by CI via `aws ssm send-command`).
# Usage: deploy.sh <ecr-image-uri-with-sha-tag> <frontend-tarball-s3-uri>
set -euo pipefail

IMAGE="$1"
FRONTEND_TARBALL="$2"
ENV_FILE=/opt/study-companion/backend.env   # populated by hand from SSM Parameter Store, not by this script

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${IMAGE%%/*}"

docker pull "$IMAGE"
docker stop study-companion-backend 2>/dev/null || true
docker rm study-companion-backend 2>/dev/null || true
docker run -d --name study-companion-backend \
  --restart unless-stopped \
  -p 127.0.0.1:8000:8000 \
  --env-file "$ENV_FILE" \
  "$IMAGE"

aws s3 cp "$FRONTEND_TARBALL" /tmp/frontend.tar.gz
rm -rf /srv/www/*
tar -xzf /tmp/frontend.tar.gz -C /srv/www
rm /tmp/frontend.tar.gz

echo "Deployed $IMAGE"
