#!/bin/bash
set -e

echo "==> Keep-Alive Cron Job Starting at $(date)"

# Backend API URL
BACKEND_URL="${BACKEND_URL:-https://mentor-buddy-backend.onrender.com}"

# Frontend URLs
FRONTEND_URL_1="${FRONTEND_URL_1:-https://mentor-buddy.vercel.app}"
FRONTEND_URL_2="${FRONTEND_URL_2:-https://mentor-buddy-panel.vercel.app}"

echo "==> Pinging Backend: $BACKEND_URL/api/health"
curl -s -o /dev/null -w "Backend Status: %{http_code}\n" "$BACKEND_URL/api/health" || echo "Backend ping failed"

echo "==> Pinging Frontend 1: $FRONTEND_URL_1"
curl -s -o /dev/null -w "Frontend 1 Status: %{http_code}\n" "$FRONTEND_URL_1" || echo "Frontend 1 ping failed"

echo "==> Pinging Frontend 2: $FRONTEND_URL_2"
curl -s -o /dev/null -w "Frontend 2 Status: %{http_code}\n" "$FRONTEND_URL_2" || echo "Frontend 2 ping failed"

echo "==> Keep-Alive Completed at $(date)"
