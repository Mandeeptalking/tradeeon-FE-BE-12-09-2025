# Alert Runner Deployment Guide

## Overview

The Alert Runner is a background service that continuously evaluates trading alerts and triggers actions when conditions are met. It needs to run as a separate service from the API.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │   Backend API   │
│  (CloudFront)   │────────▶│   (ECS Fargate) │
└─────────────────┘         └─────────────────┘
                                      │
                                      │ Reads/Writes
                                      ▼
                            ┌─────────────────┐
                            │   Supabase DB   │
                            │   (Alerts Table)│
                            └─────────────────┘
                                      ▲
                                      │ Reads Active Alerts
                                      │ Writes Logs
                                      │
                            ┌─────────────────┐
                            │  Alert Runner   │
                            │  (ECS Fargate)  │
                            └─────────────────┘
```

## Deployment Steps

### Option 1: Separate ECS Service (Recommended)

1. **Create ECR Repository for Alert Runner**
2. **Build and Push Docker Image**
3. **Create ECS Task Definition**
4. **Create ECS Service**
5. **Monitor and Verify**

### Option 2: Run as Sidecar (Simpler, Less Scalable)

Run alert runner in the same ECS task as the backend API.

## Current Status

- ✅ Alert Runner code exists (`apps/alerts/runner.py`)
- ✅ Alert Manager implemented
- ✅ Database schema ready
- ❌ Alert Runner not deployed yet
- ❌ No ECS service for alert runner

## Next Steps

We'll deploy it as a separate ECS service for better scalability and isolation.

