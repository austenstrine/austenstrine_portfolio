# Frontend Choice: Next.js vs Plain React (Vite)

You asked if plain React might be simpler. That is true, but this repo is scaffolded with Next.js because:

- It still lets you build frontend-focused apps cleanly.
- You gain routing/SSR options if interview discussion goes deeper.
- It is common in modern full-stack environments.

## If You Want to Switch to Plain React

1. Replace apps/web with a Vite React TypeScript app.
2. Keep Tailwind v3 and your custom icon components.
3. Keep NEXT_PUBLIC_API_BASE_URL equivalent as VITE_API_BASE_URL.
4. Preserve API contract with apps/api unchanged.

This gives you a lower-friction frontend setup while keeping the backend and infrastructure stack identical.
