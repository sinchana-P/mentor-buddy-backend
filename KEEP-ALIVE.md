# Keep-Alive Service Configuration

## Overview

This project includes an automated keep-alive system to prevent services from being paused due to inactivity on free-tier hosting platforms (Render, Vercel).

## How It Works

The system uses a **Render cron job** that automatically pings all services every 14 minutes to keep them active.

### Components

1. **keep-alive.sh** - Bash script that pings services using curl
2. **Dockerfile.keepalive** - Lightweight Alpine Linux container for running the script
3. **Cron Job Service** - Configured in `render.yaml` to run every 14 minutes

### Schedule

- **Frequency**: Every 14 minutes (`*/14 * * * *`)
- **Why 14 minutes?**: Render's free tier pauses services after 15 minutes of inactivity

### Services Pinged

1. **Backend API**: `https://mentor-buddy-backend.onrender.com/api/health`
2. **Frontend 1**: `https://mentor-buddy.vercel.app`
3. **Frontend 2**: `https://mentor-buddy-panel.vercel.app`

## Configuration

The cron job is configured in [render.yaml](render.yaml:21-33):

```yaml
- type: cron
  name: mentor-buddy-keepalive
  env: docker
  schedule: "*/14 * * * *"
  dockerfilePath: ./Dockerfile.keepalive
  envVars:
    - key: BACKEND_URL
      value: https://mentor-buddy-backend.onrender.com
    - key: FRONTEND_URL_1
      value: https://mentor-buddy.vercel.app
    - key: FRONTEND_URL_2
      value: https://mentor-buddy-panel.vercel.app
```

## Manual Testing

To test the keep-alive script locally:

```bash
# Test with custom URLs
BACKEND_URL="http://localhost:3000" bash keep-alive.sh

# Test with production URLs
bash keep-alive.sh
```

## Monitoring

Check the cron job logs in your Render dashboard:
1. Go to Render Dashboard
2. Select the `mentor-buddy-keepalive` service
3. View logs to see ping results

## Benefits

- ✅ **No Manual Intervention**: Fully automated
- ✅ **Prevents Service Pausing**: Keeps backend active 24/7
- ✅ **Database Connection**: Backend stays connected to database
- ✅ **Zero Cost**: Uses Render's free cron job service
- ✅ **Lightweight**: Alpine Linux container (~5MB)

## Troubleshooting

### Cron job not running

1. Check Render dashboard for service status
2. Verify the schedule format is correct
3. Check environment variables are set

### Services still pausing

1. Verify URLs are correct in render.yaml
2. Check that /api/health endpoint exists and returns 200
3. Ensure cron job is deployed and running

### Modify ping frequency

Edit the schedule in [render.yaml](render.yaml:25):

```yaml
schedule: "*/10 * * * *"  # Every 10 minutes
```

## Alternative Solutions

If Render cron jobs don't work, you can use external services:

1. **UptimeRobot** - Free monitoring service (up to 50 monitors)
2. **cron-job.org** - Free cron job service
3. **Pingdom** - Uptime monitoring
4. **Better Uptime** - Modern monitoring tool

Simply configure them to ping your `/api/health` endpoint every 14 minutes.

---

**Note**: The keep-alive system is optional but recommended for free-tier deployments to ensure consistent availability.
