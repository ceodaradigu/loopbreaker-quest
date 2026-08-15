"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  audiotool,
  type AuthenticatedClient,
  type BrowserAuthResult,
  type SyncedDocument,
} from "@audiotool/nexus";
import { createTypedArray, Ticks } from "@audiotool/nexus/utils";

type ProjectRef = {
  name: string;
  displayName: string;
};

type SessionSnapshot = {
  bars: number;
  bpm: number;
  notes: number;
  noteRegions: number;
  patterns: number;
  instruments: number;
  effects: number;
  pitchClasses: number;
  velocitySpread: number;
};

type Mission = {
  id: "arc" | "motif" | "contrast" | "pulse";
  number: string;
  label: string;
  title: string;
  brief: string;
  target: string;
  reward: number;
  accent: string;
};

type Variation = {
  id: "question" | "lift" | "space";
  eyebrow: string;
  name: string;
  summary: string;
  cells: number[][];
};

const CLIENT_ID = process.env.NEXT_PUBLIC_AUDIOTOOL_CLIENT_ID ?? "";

const DEMO_SNAPSHOT: SessionSnapshot = {
  bars: 8,
  bpm: 124,
  notes: 27,
  noteRegions: 2,
  patterns: 2,
  instruments: 3,
  effects: 1,
  pitchClasses: 4,
  velocitySpread: 0.09,
};

const VARIATIONS: Variation[] = [
  {
    id: "question",
    eyebrow: "Call + response",
    name: "Answer the loop",
    summary: "A pentatonic reply that leaves the original phrase room to breathe.",
    cells: [
      [13], [], [11], [], [9], [11], [], [],
      [8], [], [9], [6], [], [8], [], [4],
    ],
  },
  {
    id: "lift",
    eyebrow: "Register shift",
    name: "Lift the second half",
    summary: "Repeats the rhythmic identity one octave higher for instant contrast.",
    cells: [
      [14], [], [12], [10], [], [12], [], [10],
      [9], [], [7], [5], [], [7], [5], [3],
    ],
  },
  {
    id: "space",
    eyebrow: "Negative space",
    name: "Make silence the hook",
    summary: "Sparse syncopation that creates space for the next section to arrive.",
    cells: [
      [12], [], [], [9], [], [], [11], [],
      [], [7], [], [], [9], [], [], [5],
    ],
  },
];

const formatError = (error: unknown) =>
  error instanceof Error ? error.message : "Something unexpected interrupted the session.";

function analyzeDocument(document: SyncedDocument): SessionSnapshot {
  const notes = document.queryEntities.ofTypes("note").get();
  const config = document.queryEntities.ofTypes("config").getOne();
  const pitches = new Set(notes.map((note) => note.fields.pitch.value % 12));
  const velocities = notes.map((note) => note.fields.velocity.value);
  const velocitySpread = velocities.length
    ? Math.max(...velocities) - Math.min(...velocities)
    : 0;

  const patterns = document.queryEntities
    .ofTypes(
      "tonematrixPattern",
      "beatbox8Pattern",
      "beatbox9Pattern",
      "basslinePattern",
      "machinistePattern",
      "matrixArpeggiatorPattern",
    )
    .get().length;

  const instruments = document.queryEntities
    .ofTypes(
      "space",
      "heisenberg",
      "pulverisateur",
      "gakki",
      "audioDevice",
      "bassline",
      "beatbox8",
      "beatbox9",
      "tonematrix",
      "machiniste",
    )
    .get().length;

  const effects = document.queryEntities
    .ofTypes(
      "stompboxChorus",
      "stompboxCompressor",
      "stompboxCrusher",
      "stompboxDelay",
      "stompboxFlanger",
      "stompboxGate",
      "stompboxParametricEqualizer",
      "stompboxPhaser",
      "stompboxPitchDelay",
      "stompboxReverb",
      "stompboxSlope",
      "stompboxStereoDetune",
      "stompboxTube",
      "autoFilter",
      "curve",
      "quantum",
      "quasar",
      "waveshaper",
      "panorama",
      "pulsar",
      "stereoEnhancer",
      "gravity",
    )
    .get().length;

  return {
    bars: Math.max(
      1,
      Math.round((config?.fields.durationTicks.value ?? Ticks.SemiBreve * 8) / Ticks.SemiBreve),
    ),
    bpm: Math.round(config?.fields.tempoBpm.value ?? 125),
    notes: notes.length,
    noteRegions: document.queryEntities.ofTypes("noteRegion").get().length,
    patterns,
    instruments,
    effects,
    pitchClasses: pitches.size,
    velocitySpread,
  };
}

function buildMissions(snapshot: SessionSnapshot): Mission[] {
  return [
    {
      id: "arc",
      number: "01",
      label: "ARRANGEMENT",
      title: snapshot.bars < 24 ? "Escape the eight-bar orbit" : "Protect the long-form arc",
      brief:
        snapshot.bars < 24
          ? `Your project is ${snapshot.bars} bars long. Build a B section before polishing another loop.`
          : `You have ${snapshot.bars} bars. Remove one repeated section and earn the return of the hook.`,
      target: snapshot.bars < 24 ? "Reach 24+ bars" : "Create 3 distinct sections",
      reward: 250,
      accent: "acid",
    },
    {
      id: "motif",
      number: "02",
      label: "COMPOSITION",
      title: "Transform, don’t duplicate",
      brief: `${snapshot.notes} notes use ${snapshot.pitchClasses} pitch classes. Answer the motif with a changed contour, register, or rhythm.`,
      target: "Add one related variation",
      reward: 300,
      accent: "violet",
    },
    {
      id: "contrast",
      number: "03",
      label: "SOUND ROLE",
      title: "Give every layer a job",
      brief: `${snapshot.instruments} instruments and ${snapshot.effects} effects are active. Add contrast only where the arrangement needs a new role.`,
      target: "Name the role before the sound",
      reward: 200,
      accent: "orange",
    },
    {
      id: "pulse",
      number: "04",
      label: "FEEL",
      title: snapshot.velocitySpread < 0.2 ? "Break the velocity grid" : "Keep the human pulse",
      brief:
        snapshot.velocitySpread < 0.2
          ? "The dynamic range is tight. Create a deliberate accent pattern instead of randomizing every hit."
          : "Dynamics already move. Preserve the strong beats and leave the ghost notes quiet.",
      target: "Create one audible accent arc",
      reward: 250,
      accent: "blue",
    },
  ];
}

function calculateMomentum(snapshot: SessionSnapshot) {
  const arrangement = Math.min(30, snapshot.bars * 1.25);
  const pitch = Math.min(20, snapshot.pitchClasses * 3);
  const layers = Math.min(20, snapshot.instruments * 4);
  const development = Math.min(20, (snapshot.noteRegions + snapshot.patterns) * 2.5);
  const dynamics = Math.min(10, snapshot.velocitySpread * 40);
  return Math.max(12, Math.round(arrangement + pitch + layers + development + dynamics));
}

function MiniGrid({ variation }: { variation: Variation }) {
  return (
    <div className="mini-grid" aria-label={`16-step preview for ${variation.name}`}>
      {Array.from({ length: 16 }, (_, row) =>
        Array.from({ length: 16 }, (_, column) => (
          <span
            className={variation.cells[column]?.includes(row) ? "cell cell--on" : "cell"}
            key={`${row}-${column}`}
          />
        )),
      )}
    </div>
  );
}

export default function Home() {
  const [auth, setAuth] = useState<BrowserAuthResult | null>(null);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(DEMO_SNAPSHOT);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [status, setStatus] = useState<"idle" | "scanning" | "writing">("idle");
  const [notice, setNotice] = useState("Demo session loaded — connect Audiotool when you are ready.");
  const [activeMission, setActiveMission] = useState<Mission["id"]>("arc");
  const [activeVariation, setActiveVariation] = useState<Variation["id"]>("question");
  const documentRef = useRef<SyncedDocument | null>(null);

  const missions = useMemo(() => buildMissions(snapshot), [snapshot]);
  const momentum = useMemo(() => calculateMomentum(snapshot), [snapshot]);
  const variation = VARIATIONS.find((item) => item.id === activeVariation) ?? VARIATIONS[0];
  const selectedMission = missions.find((mission) => mission.id === activeMission) ?? missions[0];

  const loadProjects = useCallback(async (client: AuthenticatedClient) => {
    const response = await client.projects.listProjects({
      pageSize: 30,
      orderBy: "project.update_time desc",
    });
    if (response instanceof Error) throw response;
    const nextProjects = response.projects.map((project) => ({
      name: project.name,
      displayName: project.displayName || "Untitled project",
    }));
    setProjects(nextProjects);
    setSelectedProject((current) => current || nextProjects[0]?.name || "");
  }, []);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    const boot = async () => {
      try {
        const result = await audiotool({
          clientId: CLIENT_ID,
          redirectUrl: `${window.location.origin}/`,
          scope: "project:write",
        });
        if (cancelled) return;
        setAuth(result);
        if (result.status === "authenticated") {
          await loadProjects(result);
          setNotice(`Connected as ${result.userName}. Choose a project to scan.`);
        }
      } catch (error) {
        if (!cancelled) setNotice(formatError(error));
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadProjects]);

  useEffect(() => {
    return () => {
      if (documentRef.current) void documentRef.current.stop();
    };
  }, []);

  const connect = () => {
    if (!CLIENT_ID) {
      setNotice("Live connection is being configured. The complete demo remains available now.");
      return;
    }
    if (auth?.status === "unauthenticated") {
      auth.login();
      return;
    }
    if (auth?.status === "authenticated") {
      setMode("live");
      setNotice(`Connected as ${auth.userName}. Choose a project and run the scan.`);
    }
  };

  const scanProject = async () => {
    if (auth?.status !== "authenticated" || !selectedProject) {
      setNotice("Connect Audiotool and select a project first.");
      return;
    }

    setStatus("scanning");
    try {
      if (documentRef.current) await documentRef.current.stop();
      const nextDocument = await auth.open(selectedProject);
      await nextDocument.start();
      documentRef.current = nextDocument;
      const nextSnapshot = analyzeDocument(nextDocument);
      setSnapshot(nextSnapshot);
      setMode("live");
      const projectName = projects.find((project) => project.name === selectedProject)?.displayName;
      setNotice(`${projectName ?? "Project"} scanned live. Your next four moves are ready.`);
    } catch (error) {
      setNotice(`Scan failed: ${formatError(error)}`);
    } finally {
      setStatus("idle");
    }
  };

  const forgeVariation = async () => {
    if (!documentRef.current || mode !== "live") {
      setNotice("Preview ready. Connect a live project to forge this variation into Audiotool.");
      return;
    }

    setStatus("writing");
    try {
      const liveDocument = documentRef.current;
      const matrix = variation.cells;

      await liveDocument.modify((transaction) => {
        const existingMatrices = transaction.entities.ofTypes("tonematrix").get();
        const tonematrix = transaction.create("tonematrix", {
          displayName: `Loopbreaker — ${variation.name}`,
          positionX: 160 + existingMatrices.length * 180,
          positionY: 160,
          patternIndex: 0,
        });

        transaction.create("tonematrixPattern", {
          slot: tonematrix.fields.patternSlots.array[0].location,
          steps: createTypedArray(16, (step) => ({
            notes: createTypedArray(16, (note) => matrix[step]?.includes(note) ?? false),
          })),
        });

        let freeChannel = transaction.entities
          .ofTypes("mixerChannel")
          .get()
          .find(
            (channel) =>
              transaction.entities.pointingTo
                .locations(channel.fields.audioInput.location)
                .get().length === 0,
          );

        if (!freeChannel) {
          const nextOrder =
            transaction.entities
              .ofTypes(
                "mixerChannel",
                "mixerGroup",
                "mixerAux",
                "mixerDelayAux",
                "mixerReverbAux",
              )
              .get()
              .reduce(
                (highest, channel) =>
                  Math.max(
                    highest,
                    channel.fields.displayParameters.fields.orderAmongStrips.value,
                  ),
                -1,
              ) + 1;
          freeChannel = transaction.create("mixerChannel", {
            displayParameters: { orderAmongStrips: nextOrder },
          });
        }

        transaction.create("desktopAudioCable", {
          fromSocket: tonematrix.fields.audioOutput.location,
          toSocket: freeChannel.fields.audioInput.location,
        });
      });

      setSnapshot(analyzeDocument(liveDocument));
      setNotice(`“${variation.name}” is now a connected Tonematrix pattern in your live project.`);
    } catch (error) {
      setNotice(`Write failed safely: ${formatError(error)}`);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Loopbreaker home">
          <span className="brand-mark" aria-hidden="true">∞</span>
          <span>LOOPBREAKER</span>
        </a>
        <div className="header-meta">
          <span className="live-dot" />
          <span>{mode === "live" ? "LIVE NEXUS SESSION" : "INTERACTIVE DEMO"}</span>
        </div>
        <button className="header-action" onClick={connect} type="button">
          {auth?.status === "authenticated" ? `@${auth.userName}` : "CONNECT AUDIOTOOL"}
          <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span>COMPOSITION COACH</span><span>BUILT ON NEXUS</span></div>
          <h1>YOUR LOOP IS<br /><em>NOT</em> THE SONG.</h1>
          <p>
            Loopbreaker reads the structure of your live Audiotool project,
            finds where momentum stalls, and turns the next musical move into a playable mission.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => document.getElementById("console")?.scrollIntoView({ behavior: "smooth" })} type="button">
              ANALYZE THE SESSION <span aria-hidden="true">↓</span>
            </button>
            <a className="text-link" href="#how-it-works">HOW IT WORKS <span aria-hidden="true">→</span></a>
          </div>
        </div>

        <div className="hero-visual" aria-label="Arrangement loop visualization">
          <div className="orbit orbit--one" />
          <div className="orbit orbit--two" />
          <div className="orbit orbit--three" />
          <div className="hero-disc">
            <span className="disc-label">LOOP</span>
            <strong>{snapshot.bars}</strong>
            <span>BARS</span>
          </div>
          <div className="break-tag">BREAK HERE <span>↗</span></div>
          <div className="sound-bars" aria-hidden="true">
            {Array.from({ length: 34 }, (_, index) => (
              <i key={index} style={{ height: `${18 + ((index * 17) % 74)}%` }} />
            ))}
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Product promises">
        <span>READS THE PROJECT</span><b>✦</b><span>RESPECTS THE ORIGINAL</span><b>✦</b><span>WRITES ONLY ON COMMAND</span><b>✦</b><span>NO PAID AI API</span>
      </section>

      <section className="console-section" id="console">
        <div className="section-heading">
          <div>
            <span className="section-number">01 / SESSION SCAN</span>
            <h2>THE LOOP<br />UNDER A MICROSCOPE.</h2>
          </div>
          <p>Structure, contrast, and movement — measured from the project graph, not guessed from a prompt.</p>
        </div>

        <div className="console-shell">
          <div className="console-topbar">
            <div className="console-lights"><i /><i /><i /></div>
            <span>LOOPBREAKER // NEXUS CONSOLE</span>
            <span className="console-mode">{mode.toUpperCase()}</span>
          </div>

          <div className="console-controls">
            <label>
              <span>PROJECT</span>
              <select
                disabled={auth?.status !== "authenticated" || status !== "idle"}
                onChange={(event) => setSelectedProject(event.target.value)}
                value={selectedProject}
              >
                {projects.length === 0 ? (
                  <option>Demo — Midnight Circuit</option>
                ) : (
                  projects.map((project) => (
                    <option key={project.name} value={project.name}>{project.displayName}</option>
                  ))
                )}
              </select>
            </label>
            <button
              className="scan-button"
              disabled={status !== "idle"}
              onClick={auth?.status === "authenticated" ? scanProject : connect}
              type="button"
            >
              {status === "scanning" ? "SCANNING…" : auth?.status === "authenticated" ? "SCAN LIVE PROJECT" : "CONNECT FOR LIVE SCAN"}
            </button>
          </div>

          <div className="metric-grid">
            <article className="metric-card metric-card--hero">
              <span>MOMENTUM SCORE</span>
              <div className="score-ring" style={{ "--score": `${momentum * 3.6}deg` } as CSSProperties}>
                <strong>{momentum}</strong><small>/100</small>
              </div>
              <p>{momentum < 55 ? "The idea is alive. The arrangement needs a decision." : "The arrangement is moving. Protect its contrast."}</p>
            </article>
            <article className="metric-card"><span>PROJECT LENGTH</span><strong>{snapshot.bars}<small> BARS</small></strong><div className="metric-line"><i style={{ width: `${Math.min(100, snapshot.bars * 2)}%` }} /></div><p>Target: 24–64 bars</p></article>
            <article className="metric-card"><span>PITCH PALETTE</span><strong>{snapshot.pitchClasses}<small> / 12</small></strong><div className="dot-row">{Array.from({ length: 12 }, (_, i) => <i className={i < snapshot.pitchClasses ? "active" : ""} key={i} />)}</div><p>{snapshot.notes} notes detected</p></article>
            <article className="metric-card"><span>DEVELOPMENT</span><strong>{snapshot.noteRegions + snapshot.patterns}<small> EVENTS</small></strong><div className="stairs"><i /><i /><i /><i /></div><p>{snapshot.noteRegions} regions · {snapshot.patterns} patterns</p></article>
            <article className="metric-card"><span>SONIC ROLES</span><strong>{snapshot.instruments}<small> VOICES</small></strong><div className="role-stack"><i>RHYTHM</i><i>HARMONY</i><i>HOOK</i></div><p>{snapshot.effects} effect devices</p></article>
            <article className="metric-card"><span>SESSION TEMPO</span><strong>{snapshot.bpm}<small> BPM</small></strong><div className="pulse-line" /><p>Read from project config</p></article>
          </div>

          <div className="console-notice" role="status"><span>{status === "idle" ? "●" : "◌"}</span>{notice}</div>
        </div>
      </section>

      <section className="mission-section">
        <div className="section-heading section-heading--light">
          <div>
            <span className="section-number">02 / NEXT MOVES</span>
            <h2>FOUR MISSIONS.<br />ONE FINISHED SONG.</h2>
          </div>
          <p>Each mission responds to the session. Pick one constraint, make one musical decision, then rescan.</p>
        </div>

        <div className="mission-layout">
          <div className="mission-list">
            {missions.map((mission) => (
              <button
                className={`mission-row ${activeMission === mission.id ? "mission-row--active" : ""}`}
                key={mission.id}
                onClick={() => setActiveMission(mission.id)}
                type="button"
              >
                <span className="mission-index">{mission.number}</span>
                <span className={`mission-accent mission-accent--${mission.accent}`} />
                <span className="mission-copy"><small>{mission.label}</small><strong>{mission.title}</strong><em>{mission.brief}</em></span>
                <span className="mission-reward">+{mission.reward}<small>XP</small></span>
                <span className="mission-arrow" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>

          <aside className="mission-detail">
            <span className="detail-kicker">ACTIVE MISSION · {selectedMission.number}</span>
            <h3>{selectedMission.title}</h3>
            <p>{selectedMission.brief}</p>
            <div className="target-card"><span>TARGET</span><strong>{selectedMission.target}</strong></div>
            <div className="xp-bar"><i style={{ width: `${Math.min(100, selectedMission.reward / 3)}%` }} /></div>
            <small>Constraint over prescription. Your musical decision stays yours.</small>
          </aside>
        </div>
      </section>

      <section className="forge-section">
        <div className="forge-copy">
          <span className="section-number">03 / VARIATION FORGE</span>
          <h2>DON’T JUST<br />GET ADVICE.<br /><em>HEAR THE MOVE.</em></h2>
          <p>Choose a compositional strategy. Loopbreaker creates a new, connected Tonematrix pattern without touching your original devices.</p>
          <div className="variation-tabs" role="tablist" aria-label="Variation strategies">
            {VARIATIONS.map((item) => (
              <button
                aria-selected={activeVariation === item.id}
                className={activeVariation === item.id ? "active" : ""}
                key={item.id}
                onClick={() => setActiveVariation(item.id)}
                role="tab"
                type="button"
              >{item.eyebrow}</button>
            ))}
          </div>
          <button className="forge-button" disabled={status !== "idle"} onClick={forgeVariation} type="button">
            {status === "writing" ? "FORGING…" : mode === "live" ? "FORGE INTO AUDIOTOOL" : "PREVIEW IN DEMO MODE"}
            <span aria-hidden="true">↗</span>
          </button>
        </div>

        <div className="forge-panel">
          <div className="forge-panel-top"><span>PATTERN 01</span><span>C PENTATONIC · 16 STEPS</span></div>
          <MiniGrid variation={variation} />
          <div className="variation-card"><small>{variation.eyebrow}</small><strong>{variation.name}</strong><p>{variation.summary}</p></div>
          <div className="forge-safety"><span>✓</span><p><strong>NON-DESTRUCTIVE WRITE</strong><br />Adds a named device, pattern, and mixer cable. Existing music stays untouched.</p></div>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading section-heading--compact">
          <div><span className="section-number">04 / THE LOOP</span><h2>SCAN. CHOOSE.<br />BUILD. REPEAT.</h2></div>
        </div>
        <div className="how-grid">
          <article><span>01</span><div className="how-icon">◎</div><h3>READ THE SESSION</h3><p>Nexus exposes notes, regions, patterns, devices, routing, tempo, and project duration in real time.</p></article>
          <article><span>02</span><div className="how-icon">⌁</div><h3>FIND THE STALL</h3><p>Deterministic heuristics reveal repetition risk without sending your project to a third-party model.</p></article>
          <article><span>03</span><div className="how-icon">↗</div><h3>MAKE ONE MOVE</h3><p>Play a focused mission or forge a safe variation. Nothing changes until you choose.</p></article>
          <article><span>04</span><div className="how-icon">∞</div><h3>RESCAN THE SONG</h3><p>The coaching loop updates as your arrangement grows — multiplayer changes included.</p></article>
        </div>
      </section>

      <footer>
        <div className="footer-mark">∞</div>
        <div><strong>LOOPBREAKER</strong><p>Turn repetition into direction.</p></div>
        <div className="footer-meta"><span>BUILT FOR LET’S BUILD! 2026</span><span>POWERED BY AUDIOTOOL NEXUS</span></div>
      </footer>
    </main>
  );
}
