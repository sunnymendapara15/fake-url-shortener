# Fake URL Shortener

A playful URL shortener demo that combines a React SPA with a lightweight Node.js/Express API. The backend issues short keys, increments click counts, and the frontend caches every generated link + counter in `localStorage` so your history survives refreshes.

## Features
- Submit any URL to receive a fake short link backed by the Express API.
- Store every short link + click count in `localStorage` (`fake-url-shortener-links` key).
- Click any saved entry to increment the backend counter and open the original target in a new tab.
- Simple UI that reports status messages and lets you copy the short link.

## Getting started

### Backend
```bash
cd backend
npm install
npm start
```
The Express API listens on port `5000` by default.

### Frontend
```bash
cd frontend
npm install
npm start
```
The React app runs on port `3000` and calls `http://localhost:5000` by default. You can override that base URL by setting the `REACT_APP_API_BASE_URL` environment variable before starting the frontend.

## Local data persistence
Every generated link is saved as an entry in `localStorage` under the `fake-url-shortener-links` key. Clearing that storage area removes your saved history, but the backend keeps counting clicks so reopened links will sync back the counts.

## Folder layout
- `backend/`: Node.js/Express API with in-memory link storage and click counter endpoints.
- `frontend/`: Create React App–style SPA that interacts with the API and `localStorage`.
