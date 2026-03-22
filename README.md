# Guess Who?

A real-time multiplayer digital board game — play the classic "Guess Who?" with friends or strangers on any device.

**Live:** [guess-who-alpha.vercel.app](https://guess-who-alpha.vercel.app)

## Features

- **2-player real-time multiplayer** via WebSockets
- **7 categories:** Mutual Friends, Digital Creators & Reality TV, Music Artists, Actors, Athletes, Bible Characters, Famous Faces
- **Two game modes:** Remote (typed Q&A) and In-Person (verbal Q&A)
- **Mutual Friends** — create custom character boards with your own friends
- **Snipe system** — guess your opponent's character at any time, verified by the server
- **Best-of-3** series support
- **Room codes** and **invite links** for easy joining
- **Quick Match** matchmaking for strangers
- **Sound effects** with mute toggle
- **PWA** — installable on mobile devices
- **Responsive** — works on phones, tablets, and desktop

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Zustand, Framer Motion |
| Backend | Node.js, Express, Socket.io, TypeScript |
| Shared | npm workspaces monorepo with shared types package |
| Deployment | Vercel (frontend), Railway (backend) |

## Project Structure

```
guess-who/
  client/          # React SPA (Vite)
  server/          # Express + Socket.io server
  shared/          # Shared TypeScript types and category data
  e2e/             # Playwright E2E tests
  package.json     # Root workspace config
```

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Clone the repo
git clone https://github.com/victor-nwoseh/Guess-Who.git
cd Guess-Who

# Install all dependencies (workspaces)
npm install

# Build the shared types package
npm run build --workspace=shared

# Start both dev servers
npm run dev --workspace=server   # runs on :3001
npm run dev --workspace=client   # runs on :5173
```

Open `http://localhost:5173` in two browser tabs to test.

### Environment Variables

**Client** (`client/.env.development`):
```
VITE_SERVER_URL=http://localhost:3001
```

**Server** (optional, defaults shown):
```
PORT=3001
CLIENT_URL=http://localhost:5173
```

## Running Tests

```bash
# Server unit tests
npm test --workspace=server

# Client unit tests
npm test --workspace=client

# E2E tests (starts dev servers automatically)
npx playwright test
```

## Deployment

### Backend (Railway)

1. Create a Railway project linked to the GitHub repo
2. Set root directory to repo root
3. Build command: `npm install && npm run build --workspace=shared && npm run build --workspace=server`
4. Start command: `npm run start --workspace=server`
5. Env vars: `CLIENT_URL` = your Vercel frontend URL
6. Generate a public domain under Settings > Networking

### Frontend (Vercel)

1. Create a Vercel project linked to the GitHub repo
2. Root directory: `/`
3. Build command: `npm install && npm run build --workspace=shared && npm run build --workspace=client`
4. Output directory: `client/dist`
5. Env var: `VITE_SERVER_URL` = your Railway backend URL

## Adding Categories / Images

Character rosters are defined in `shared/src/categories.ts`. Each category has up to 50 characters with portrait images stored in `client/public/images/categories/{category-slug}/`.

Images should be JPEG, approximately 400x400px, square aspect ratio. See `README-IMAGES.md` for the full list of required images per category.

Sound effects are in `client/public/sounds/`. See `README-SOUNDS.md` for details.
