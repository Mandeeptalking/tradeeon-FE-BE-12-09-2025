# Tradeeon API

Backend API for the Tradeeon trading platform built with FastAPI.

## Setup

1. Install dependencies:
   ```bash
   pip install -e .
   ```

2. Run the development server:
   ```bash
   uvicorn apps.api.main:app --reload --port 8000
   ```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /me` - Get current user information

## Development

The API is configured with CORS to allow requests from the frontend running on `http://localhost:5173`.


