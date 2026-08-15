# Loopbreaker Quest

> Your loop is not the song.

Loopbreaker is a live composition coach for Audiotool. It reads a project through Nexus, detects where musical momentum is stalling, and turns the next move into a focused mission. When the artist wants a concrete starting point, it can add a new Tonematrix variation without changing or deleting existing music.

Built for **Audiotool Let’s Build! 2026**. Primary categories: **Music Games**, **Composition**, and **Songstarter**.

## The problem

Starting a loop is easy. Deciding what the song needs next is not. Producers often polish the same eight bars because generic advice such as “add variation” does not connect to the actual session.

Loopbreaker closes that gap:

1. **Scan** the live project graph.
2. **Measure** arrangement length, pitch palette, development, active roles, dynamics, and tempo.
3. **Choose** one context-aware mission instead of receiving a long checklist.
4. **Build** the move manually or add one safe Tonematrix variation.
5. **Rescan** as the song develops, including collaborative edits.

## What works

- Interactive demo with a complete example session and audible Web Audio previews; no account or paid API required.
- Audiotool browser OAuth using the minimal `project:write` scope.
- Live project picker and Nexus document synchronization.
- Deterministic analysis of notes, note regions, patterns, instruments, effects, duration, tempo, pitch classes, and velocity spread.
- Four adaptive mission families: arrangement, motif, sonic role, and pulse.
- Three deterministic 16-step Tonematrix strategies: call-and-response, register lift, and negative space.
- Explicit, non-destructive write: creates a named Tonematrix, its pattern, and a mixer cable only after the user clicks.
- Responsive, keyboard-accessible product surface with reduced-motion support.

## Nexus integration

Loopbreaker uses `@audiotool/nexus` `0.0.17`.

```text
Audiotool OAuth
      ↓
projects.listProjects()
      ↓
client.open(project) → document.start()
      ↓
queryEntities(notes, regions, patterns, devices, config)
      ↓
deterministic score + four missions
      ↓ explicit user action
document.modify() → Tonematrix + pattern + mixer cable
```

The live write is intentionally additive. The code contains no entity deletion path, does not mutate the artist’s existing devices, and does not send project contents to a third-party model.

## Local setup

Requirements: Node.js 22.13+ and npm.

```bash
npm install
npm run dev
```

The demo runs without configuration. For the live Nexus flow, register the deployed redirect URL in Audiotool Developer Hub and create `.env.local`:

```bash
NEXT_PUBLIC_AUDIOTOOL_CLIENT_ID=your_public_client_id
```

The client ID is an OAuth public identifier, not a secret. Never add access tokens or credentials to the repository.

## Verification

```bash
npm test
npm run typecheck
npm run lint
```

The current automated checks verify server rendering, the explicit/non-destructive Nexus write contract, and all three variation paths. A live write still requires an Audiotool project and a registered OAuth redirect.

## Demo flow (2–5 minutes)

1. Open the demo and introduce the eight-bar-loop problem.
2. Show the session scan and explain the momentum score.
3. Switch among the four missions and show how their wording responds to project evidence.
4. Play all three Tonematrix strategies directly in the browser.
5. Connect Audiotool, scan a live project, and forge one variation.
6. Return to Audiotool and show the newly named device, pattern, and cable beside untouched existing music.

## Design choices and limits

- The score is a transparent coaching heuristic, not a claim about musical quality.
- Generated notes use a fixed C-pentatonic map so the demo is reproducible. A future version can infer tonal center and remap the same strategies.
- The live path depends on Audiotool Nexus availability and a valid client ID.
- Loopbreaker gives constraints and starting material; authorship stays with the producer.

## Technology

React 19, TypeScript 5.9, vinext/Vite, Cloudflare Workers, and Audiotool Nexus. No database, paid AI service, analytics SDK, or user-content storage.

## License

The submission source is provided for hackathon evaluation. Third-party packages retain their respective licenses; `@audiotool/nexus` is MIT licensed.
