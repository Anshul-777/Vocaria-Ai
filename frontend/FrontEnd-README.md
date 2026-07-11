<div align="center">

# 🎙️ Vocaria · Frontend

### The interface layer for the Enterprise Voice AI Platform

<p>
  <img alt="React" src="https://img.shields.io/badge/React-18-149ECA?style=for-the-badge&logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>
<p>
  <img alt="Framer Motion" src="https://img.shields.io/badge/Framer_Motion-11-0055FF?style=flat-square&logo=framer&logoColor=white" />
  <img alt="Zustand" src="https://img.shields.io/badge/State-Zustand-443E38?style=flat-square" />
  <img alt="React Query" src="https://img.shields.io/badge/Data-TanStack_Query-FF4154?style=flat-square&logo=reactquery&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Auth-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" />
  <img alt="Recharts" src="https://img.shields.io/badge/Charts-Recharts-22B5BF?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/License-Apache_2.0-blue?style=flat-square" />
</p>

**A cinematic, animation-rich React single-page application** for creating, refining,<br/>distributing, and defending synthetic voice.

[🌐 Live Platform](https://vocaria-ai.vercel.app/) · [👤 Portfolio](https://anshul-portfolio.vercel.app/) · [✨ AexoTreX](https://aexotrex.vercel.app/)

</div>

---

## 📖 Overview

The Vocaria frontend is a **type-safe, component-driven SPA** that surfaces the entire voice
stack — real-time conversational agents, expressive multilingual speech generation, a studio
editor, a community voice hub, zero-shot cloning, and live deepfake detection — behind a
single, cohesive, premium interface.

It is engineered for **motion, density, and clarity**: scroll-reactive layouts powered by
Framer Motion, a disciplined design-token system in Tailwind, and a lazy-loaded route graph
that keeps the initial payload lean.

> [!NOTE]
> The landing experience (`src/pages/Landing.tsx`) is a fully self-contained, scroll-driven
> showcase — parallax heroes, an interactive Featured Voices player, live mock dashboards,
> and animated data visualizations — all rendered without external media dependencies.

---

## 🧩 Core Capabilities Surfaced

| Pillar | Route(s) | What the UI delivers |
| :-- | :-- | :-- |
| 🤖 **Vocaria Agent** | `/agent` | Real-time conversational voice sessions with live latency telemetry |
| 🎚️ **Vocaria Studio** | `/studio` | Multi-track sequencing, per-phrase direction, master export |
| 🪄 **Generation Engine** | `/generate` | 17-language TTS with speed · pitch · temperature · SSML · emotion styles |
| 🌐 **Vocaria Hub** | `/hub`, `/hub/:id`, `/u/:username` | Community voice library — like, save, share, one-click clone |
| 🫆 **Voice Cloning** | `/clone`, `/voices`, `/voices/:id` | 3-second zero-shot cloning, quality analysis, embedding extraction |
| 🛡️ **Deepfake Detection** | `/detection`, `/detection/live`, `/detection/:id` | Ensemble scoring, real-time WebSocket streaming, diarization, custody logs |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         App.tsx (Router)                        │
│   BrowserRouter · Suspense · lazy() route graph · Toaster       │
├───────────────┬───────────────────────────┬────────────────────┤
│  PublicOnly   │        Protected          │     AuthLayout     │
│  (Landing)    │   (AppLayout + pages)     │  (login/register)  │
├───────────────┴───────────────────────────┴────────────────────┤
│  State: Zustand (authStore) · Server cache: TanStack Query      │
│  Transport: axios client + Supabase JS (auth/session)           │
│  Motion: Framer Motion · Charts: Recharts · Audio: wavesurfer   │
└──────────────────────────────────────────────────────────────┘
```

### 📁 Project Structure

```
frontend/
├─ index.html                 # Vite entry · SEO + Open Graph meta
├─ src/
│  ├─ main.tsx                # React root bootstrap
│  ├─ App.tsx                 # Router, guards, lazy routes
│  ├─ index.css               # Design tokens + Tailwind layers + fonts
│  ├─ api/client.ts           # axios instance (interceptors, base URL)
│  ├─ lib/supabase.ts         # Supabase client (auth + session)
│  ├─ store/authStore.ts      # Zustand global auth state
│  ├─ hooks/                  # motionVariants, useScrollAnimations
│  ├─ components/
│  │  ├─ layout/              # AppLayout, AuthLayout
│  │  ├─ audio/               # WaveformVisualizer
│  │  ├─ charts/              # ConfidenceTimeline
│  │  └─ ui/                  # Logo, badges, shared primitives, chatbot
│  └─ pages/
│     ├─ Landing.tsx          # ⭐ Cinematic marketing landing
│     ├─ agent/ studio/ voices/ detection/ hub/ analytics/ …
│     └─ auth/                # login, register, onboarding, reset
├─ tailwind.config.js         # Brand / accent / surface color scales
├─ vite.config.ts             # Build + dev server config
└─ vercel.json                # SPA rewrite rules
```

---

## 🎨 Design System

The visual language lives in **`tailwind.config.js`** and **`src/index.css`** as a small,
strict set of tokens — no ad-hoc colors, no magic numbers.

<details>
<summary><b>🎨 Color scales</b> (click to expand)</summary>

```js
// tailwind.config.js — theme.extend.colors
brand:   { 50 → 950 }   // #3a5cf7 indigo — primary actions & focus
accent:  { 50 → 900 }   // #d946ef fuchsia — highlights & gradients
surface: { 0 → 900 }    // neutral slate ramp — text & chrome
success | warning | danger | amber       // semantic status
```
</details>

<details>
<summary><b>✍️ Typography & motion</b></summary>

```css
/* src/index.css */
@import url('...Instrument+Serif...&family=Inter...');
/* Display headings → 'Instrument Serif'  ·  Body/UI → 'Inter' */

/* Reusable animation tokens (tailwind.config.js) */
fade-in · slide-up · slide-in-right · wave · shimmer · bounce-subtle
```
</details>

> [!TIP]
> **Scroll motion pattern** — sections animate on entry *and* exit using
> `whileInView` with `viewport={{ once: false }}`, so transitions replay every time
> a block enters or leaves the viewport, in both scroll directions.

---

## 🔌 Environment

Configuration is injected at build time through Vite's `import.meta.env`. Values are read by
`src/lib/supabase.ts` and `src/api/client.ts`.

```env
# .env  (never commit real keys)
VITE_API_BASE_URL=https://your-backend.example.com
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

| Variable | Consumed by | Purpose |
| :-- | :-- | :-- |
| `VITE_API_BASE_URL` | `api/client.ts` | Backend REST + WebSocket origin |
| `VITE_SUPABASE_URL` | `lib/supabase.ts` | Supabase project endpoint |
| `VITE_SUPABASE_ANON_KEY` | `lib/supabase.ts` | Public anon key for browser auth |

---

## 🛣️ Route Map

<details>
<summary><b>Public & auth routes</b></summary>

```tsx
/                      → Landing            (PublicOnly)
/login  /register      → Auth               (PublicOnly · AuthLayout)
/forgot-password       → ForgotPassword
/reset-password        → ResetPassword
/verify-email          → VerifyEmail
/u/:username           → PublicProfile      (public creator page)
```
</details>

<details>
<summary><b>Authenticated app routes</b> (wrapped in <code>Protected → AppLayout</code>)</summary>

```tsx
/dashboard   /voices   /voices/new   /voices/:id
/agent       /clone    /generate
/detection   /detection/live   /detection/:id
/hub         /hub/:id
/studio      /analytics   /billing   /history
/notifications   /audit   /settings   /profile
/api-docs    /benchmarks  /quality    /admin
```
</details>

---

## 🧠 State & Data Flow

```
Supabase Auth ──▶ onAuthStateChange ──▶ Zustand authStore ──▶ UI guards
                                                    │
axios client ──▶ TanStack Query cache ──▶ components ┘
```

- **Auth** — `Protected` and `PublicOnly` guards subscribe to Supabase sessions and hydrate
  the Zustand store, redirecting appropriately.
- **Server state** — TanStack Query owns caching, revalidation, and background refresh.
- **Client state** — Zustand holds lightweight global UI/auth state.

---

## 📦 Technology

| Layer | Choice |
| :-- | :-- |
| **Framework** | React 18 + TypeScript |
| **Build** | Vite 5 (esbuild) |
| **Styling** | Tailwind CSS 3.4 + custom design tokens |
| **Motion** | Framer Motion 11 |
| **Routing** | React Router 6 (lazy + Suspense) |
| **Server state** | TanStack Query 5 |
| **Client state** | Zustand 5 |
| **Auth** | Supabase JS |
| **Charts** | Recharts |
| **Audio** | wavesurfer.js |
| **Forms** | React Hook Form + Zod |
| **Deploy** | Vercel |

---

<div align="center">

### Crafted with care.

Built by [**Anshul**](https://anshul-portfolio.vercel.app/) · Powered by [**AexoTreX**](https://aexotrex.vercel.app/)

<sub>© Vocaria — the complete voice layer for the modern internet.</sub>

</div>
