# ADMP-2026

Git rep for homeworks.

**21110333** — Doan Nguyen Nam Trung

## App setup

### Prerequisites

- [Bun](https://bun.sh) (for the API)
- [Node.js](https://nodejs.org) and npm (for the mobile app)

### Backend (`BackEndTS`)

```bash
cd BackEndTS
bun install
```

Configure environment variables in `BackEndTS/.env` (database URL, Clerk keys, etc.) as required by the project.

Run the server:

```bash
bun run dev
# or: bun run start
```

### Frontend (`Frontend`)

```bash
cd Frontend
npm install
npx expo start
```

Use the Expo CLI to open the app in a simulator, on a device, or on the web.
