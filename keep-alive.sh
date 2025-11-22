#!/bin/bash
set -e

echo "==> Keep-Alive Cron Job Starting at $(date)"

# Backend API URL
BACKEND_URL="${BACKEND_URL:-https://mentor-buddy-backend.onrender.com}"

# Frontend URL
FRONTEND_URL="${FRONTEND_URL:-https://mentor-buddy.vercel.app}"

echo "==> Pinging Backend: $BACKEND_URL/api/health"
curl -s -o /dev/null -w "Backend Status: %{http_code}\n" "$BACKEND_URL/api/health" || echo "Backend ping failed"

echo "==> Pinging Frontend: $FRONTEND_URL"
curl -s -o /dev/null -w "Frontend Status: %{http_code}\n" "$FRONTEND_URL" || echo "Frontend ping failed"

echo "==> Keep-Alive Completed at $(date)"
