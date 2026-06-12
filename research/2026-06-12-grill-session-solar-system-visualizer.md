# Research: Solar System / Universe Visualizer — Design Grill Session

**Date:** 2026-06-12
**Format:** "Grill me" interrogation of the initial plan (one decision at a time, each resolved deliberately)
**Status:** Planning complete; no code written yet

---

## 1. The Idea

A website that visualizes our solar system first, then scales up toward the known universe.

**Purpose / angle:** An *anti-flat-earth* educational site. Lots of people have been agreeing with flat-earthers lately; the goal is to debunk them by building credible, interactive 3D models of the solar system and beyond. The visualization itself is the argument — let people *see* and *manipulate* the real geometry.

**Original page/model concept:**
1. Landing page — full solar system model
2. Moon eclipse model page — the flagship debunking piece
3. Earth model (including the Moon)
4. Sun model
5–12. All other planets, including Pluto
13. The Main Asteroid Belt

Models 3–13 are reached by **clicking the corresponding object on the landing-page model.** Each model page has a **text panel** next to the 3D object. Stretch idea: give each planet a **chatbot** so users can "talk to the planet" and ask for facts.

The eclipse page was imagined as "like a video where you see how it happens, with a narrator explaining."

---

## 2. Decisions Made (the resolved decision tree)

Each was a fork; the chosen branch and the reasoning are recorded so future-me remembers *why*.

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| 1 | **Rendering paradigm** | **Real 3D** | A flat 2D circle is exactly what a flat-earther dismisses. Real 3D (rotate/zoom/fly) lets them *see* the geometry — it's the whole point. |
| 2 | **3D engine** | **Three.js** | Industry standard for WebGL/3D in the browser. No good Python path to real web 3D. |
| 3 | **Framework wrapper** | **Vite + React + react-three-fiber (+ drei)** | Industry-standard modern stack. React tames the 13 pages / panels / chat UI; react-three-fiber writes Three.js scenes as components; `drei` gives orbit controls, textures, camera rigs, starfields for free. Vite = fast dev loop. |
| 4 | **Chatbot timing** | **Phase 2** (visuals first) | Keeps Milestone 1 a pure static site (free, no backend). Chatbot is a bonus, not a blocker. |
| 5 | **Scale problem** | **Stylized + correct geometry by default, with a true-scale TOGGLE** | True scale is literally unviewable (Earth = 1px → Neptune ~½km off-screen). Default: compressed distances/enlarged planets but *correct* relative sizes, orbital order, orbital plane, axial tilts, sphere shape — labeled "not to scale." Toggle to true scale is the single best debunking weapon ("flip it and watch Neptune disappear"). |
| 6 | **Eclipse page** | **Real-time 3D animation** (not a pre-rendered video) | Real spheres casting real shadow cones (umbra/penumbra), user can rotate/scrub. Skeptic-proof ("rotate it yourself, the shadow is real geometry") and reuses the engine. A video gets dismissed as "CGI you made up." |
| 7 | **Milestone 1** | **Thin vertical slice** | Sun + Earth + Moon orbiting (stylized 3D) → Earth clickable → ONE data-driven detail page → **deployed live.** Proves the entire pipeline end-to-end before adding breadth. |
| 8 | **Hosting** | **Vercel** | Free, dead-simple Vite deploys (auto-build on push). Crucially, Phase 2 chatbot can run as serverless functions in the *same* project — no second host. |

---

## 3. Architecture Notes & Recommendations

- **Data-driven pages (critical):** Do NOT build 13 separate pages. Build **one** `PlanetPage` component fed by a `planets.ts` data array (name, radius, facts, texture path, orbit params). 13 data entries, not 13 pages. This is the difference between maintainable and a nightmare.
- **Backend (Phase 2):** Python/FastAPI (plays to existing Python skills) running as Vercel serverless functions. It holds the LLM API key — **the key can never live in frontend code** (it would be stolen instantly).
- **True-scale precision caveat:** True-scale distances exceed Three.js's default 32-bit float precision → planets jitter/shake when zoomed far away. Solvable (logarithmic depth buffer + scaled units) but it's real work — that's why the toggle is a *fast-follow*, not day one.

---

## 4. Content Pipeline

- **Planet textures:** Solar System Scope texture maps (CC-licensed, equirectangular — the standard for web solar-system projects) + NASA imagery. Earth gets day + night-lights + normal + specular maps for realism. No 3D modeling — images wrapped on spheres.
- **Facts:** NASA planetary fact sheets (nssdc.gsfc.nasa.gov) — unimpeachable sourcing matters for a debunking site.
- **Narration (eclipse):** Write the script, generate audio **once** with a quality TTS (e.g. ElevenLabs free tier), commit the resulting `.mp3` + `.vtt` captions as static assets. Zero runtime cost; no backend needed for narration even in Phase 1.

---

## 5. Build Order (roadmap)

1. **Milestone 1 — vertical slice:** Sun + Earth + Moon orbiting (stylized 3D), Earth clickable → one data-driven detail page → **deployed to a live Vercel URL.**
2. Add the other 10 bodies + the asteroid belt (just more `planets.ts` entries).
3. Eclipse page (real-time 3D, real shadow cones, synced narration).
4. True-scale toggle.
5. **Phase 2:** FastAPI chatbot backend (serverless on Vercel), per-planet "talk to the planet."

**Guiding principle hammered throughout:** *Deploy at Milestone 1, while it's tiny.* Get build → push → live URL working when there's almost nothing to debug, not at the end. Unlimited time + big scope + new-to-JS is the classic recipe for a project that dies at month two; vertical slices + early deployment is the antidote.

---

## 6. Open Questions / Not Yet Decided

- Exact orbital mechanics fidelity (real Keplerian orbits vs simplified circular) — deferred.
- "Scaling up to the known universe" (beyond the solar system) — acknowledged as the long-term vision, not yet designed.
- Which LLM/provider powers the Phase 2 chatbots.
- Whether to add explicit "myth vs reality" debunking callouts per page.
- Is this a solo build or a team ("we")? — not yet clarified.

---

*Generated from a `/grill-me` session. Use this as the canonical recollection of the design rationale when building future sections.*
