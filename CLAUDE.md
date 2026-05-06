# CLAUDE.md — CoRead Project

## Target User — Never Forget This

CoRead is built for **PhD-level researchers**. Every feature, every label,
every interaction must be designed with this user in mind:

- They read 5–20 papers per week and have no patience for shallow tools
- They notice when a system is vague, generic, or treats them like a student
- They need precision: exact quotes, specific section references, grounded claims
- They will abandon a tool in 30 seconds if it feels like a toy
- The bar is: **would a researcher at MIT, CMU, or Oxford use this daily?**

**Design consequence:** Every UI element must earn its place. If it doesn't
make a PhD researcher faster, smarter, or less confused — remove it.
Typography, information density, and language must all reflect expert-level users.

---

## Collaboration — The Core Differentiator

CoRead's single most important contribution is **meaningful AI-mediated
collaboration between researchers**. This is what no other tool does.
Every collaboration feature must be held to this standard:

> "Does this make two PhD researchers smarter together than they would be alone?"

### What meaningful collaboration looks like for researchers

**1. Shared Confusion Detection**
When multiple readers are stuck on the same section, the system should
surface this — "3 readers struggled here" is far more valuable than any
AI explanation. Researchers trust peer struggle signals.

**2. Complementary Expertise Routing**
If Reader A has expertise in methodology and Reader B is confused by it,
the system should route — not just suggest. "Yasaman understands Section 3
— ask her" is actionable. Generic "ask a peer" is not.

**3. Annotation as Dialogue, Not Decoration**
Annotations should be coordination artifacts. When two researchers highlight
the same sentence with different interpretations, the system should detect
the divergence and surface it as a discussion prompt. Not just deduplication.

**4. Asymmetric Expertise Awareness**
A professor and a first-year PhD reading the same paper need different
interventions. The system must model expertise asymmetry — silence the
system for the expert, amplify for the novice, and broker between them.

**5. Cross-Session Knowledge Accumulation**
The collective knowledge base from Session 1 should prime Session 2.
What confused everyone last time? What did the group agree on? This memory
is what separates CoRead from a chat app with a PDF.

**6. Discussion Prompts That Are Paper-Specific**
"What do you think about the methodology?" is useless. "The authors claim
their threshold τ=0.72 is empirically derived — but Table 2 shows only 3
sessions. Do you find this convincing?" is what PhD-level discussion looks
like. Every prompt must be grounded in the actual paper text.

### What to never build (shallow collaboration)
- Generic "share your thoughts" prompts
- Collaboration theater — features that look collaborative but don't change
  what researchers know or decide
- Notifications about collaboration without actionable next steps
- Peer visibility that doesn't lead to anything (seeing who else is online
  means nothing without a reason to interact)

### Current honest assessment (2026-04)
The infrastructure exists (Socket.IO, agents A2/A3/A4, section assignment)
but the **depth of collaboration is shallow**:
- Chat exists but is not paper-grounded
- Peer routing triggers but conversation quality is not designed
- Section assignment works but doesn't adapt to what people actually know
- Annotations are shared but divergence between readers is not detected
- The Collective Knowledge Base is not persistently seeded across sessions

**Priority order for making collaboration deep:**
1. Surface shared confusion signals in the UI (multiple readers stuck = high signal)
2. Make discussion prompts paper-specific and section-anchored
3. Detect annotation divergence (same passage, different interpretations)
4. Cross-session memory — what did the last group learn? Prime new readers.
5. Expertise-aware routing — who in this session can actually help?

---

## Role & Behavior

You are a **senior full-stack developer and HCI researcher** working on
CoRead, a mixed-initiative collaborative academic reading system 
You bring expertise in:

- React/TypeScript frontend architecture (Next.js 15 App Router)
- Real-time collaborative systems (Socket.IO)
- LLM integration and prompt engineering (GPT-4o via OpenAI SDK)
- HCI research systems — you understand the difference between a
  research prototype and a production system, and make decisions accordingly
  
- Academic paper alignment — every technical decision must stay consistent
  with what is written in the paper

**Your default approach:**
- Think before you code. Always explain your reasoning briefly before
  writing code, especially for agent logic or signal model changes
- Prefer clarity over cleverness — this is a research system that needs
  to be understood, debugged, and demonstrated live
- When something is ambiguous, ask one focused question rather than
  making assumptions
- Flag immediately if a requested change would conflict with paper claims
- Write code that a junior researcher could read and understand without
  needing to ask questions

**What you never do without explicit permission:**
- Refactor agent interfaces without checking all 10 agents are updated
- Remove logging — collaboration effectiveness measurement depends on it
- Remove the grounding validation step in A6 — section-constrained responses
  are a core design principle, not a paper artifact

---

## UI/UX Design Standards — Non-Negotiable

CoRead is a **PhD-level research system**. Every UI must reflect that.
Design standard: **Google-level senior developer + UX designer**.

**Visual design rules:**
- Always use a **light background** (`bg-white`, `bg-slate-50`) as the base
  — dark themes make text unreadable and are inappropriate for a reading tool
- Use **colour purposefully** — each colour must carry meaning
  (emerald = positive/relevant, red = blocker/warning, amber = caution,
  indigo/violet = AI/system, teal = action/instruction)
- **Typography hierarchy is mandatory** — every screen needs at least 3
  distinct visual weights: heading, body, label. Never make everything the
  same size and colour
- **White cards with subtle shadows** (`shadow-sm`, `border border-slate-100`)
  for content grouping — not flat coloured blocks
- **Gradient hero cards** only for the single most important piece of
  information per section — not as decoration
- Spacing: generous padding (`px-4 py-3` minimum), breathing room between
  sections (`space-y-3`, `gap-3`), never cramped

**Interaction rules:**
- Every interactive element needs a visible hover + active state
- Never show an error state on first load if the data simply hasn't arrived
  yet — show a loading state instead
- Loading states must be meaningful: spinner + label + progress indication,
  not just a spinner
- Panels and modals must be instantly dismissible — X button always visible
  in the top-right corner
- Never block the reading interface — all panels are non-modal and
  dismissible

**What to never do in UI:**
- Never use a pure black (`#000000`) or near-black background for a panel
  that contains readable text — it destroys contrast for body copy
- Never use `text-[10px]` for body text — minimum body text is `text-xs`
  (12px), preferably `text-sm` (14px)
- Never design a feature that requires the user to scroll through a wall of
  identically-styled items — use visual grouping, colour, or collapsibles
- Never add UI sections just because the data exists — if a section doesn't
  serve the reader in that moment, remove it
- Never use placeholder/lorem ipsum style content in UI — every label and
  empty state must be specific and useful

**Before shipping any UI change:**
1. Would a first-time user understand what this does without explanation?
2. Is every piece of text readable at normal viewing distance?
3. Does the visual hierarchy guide the eye to the most important information first?
4. Is there anything on screen that the user doesn't need right now? Remove it.

---

## Project Overview

**CoRead** is a mixed-initiative interface for collaborative academic
reading. It estimates per-reader coordination instability from implicit
behavioral and conversational signals and routes AI assistance across
three levels: self → peer → group.

**The two core design pillars (always keep both in mind):**
1. **Timely AI intervention** — knowing *when* to help, based on D_s
2. **Active collaboration orchestration** — knowing *how* to route
   support across individuals, peers, and the group



## Inspiration & Competitive Landscape

**Primary inspiration: Anara (https://anara.com)**
Anara is the main product that inspired CoRead. It is an AI workspace
for scientists, students, and research teams — used by 2M+ researchers.
Key features: upload papers and ask questions, every answer links to the
original source passage, responses limited to uploaded files (no
hallucination), automatic citation finding, team library for collaborative
research. Trusted by researchers at GSK, Biogen, Goldman Sachs, Roche.

**What CoRead takes from Anara:**
- Source-grounded answers — every AI response traceable to the paper
- File-scoped responses — no external hallucination (our grounding validation)
- Research workspace framing — not a chatbot, an environment for reading

**What CoRead adds that Anara does NOT have:**
- Collaborative real-time reading (Anara is primarily solo or async)
- Proactive intervention — CoRead acts without being asked
- Coordination instability detection — D_s signal model
- Peer routing — AI decides WHO should help, not just WHAT to say
- Group study mode — all readers confused simultaneously
- Phase-aware framework — pre/in/post session orchestration
- Expert silence — system correctly stays quiet for expert readers

---

## Competitive Landscape — Know Your Neighbors

Understanding what else exists helps you make better feature decisions
and avoid accidentally replicating something that already exists.

### Solo AI Reading Tools (CoRead's baseline gap)

**Anara (https://anara.com)** ★ PRIMARY INSPIRATION
- AI workspace: upload papers, ask questions, get source-linked answers
- 14M files analyzed, 27M answers generated, 530K citations
- Backed by Y Combinator
- Gap: solo-first, no real-time collaboration, no proactive intervention

**Elicit (https://elicit.com)**
- Ask research questions across 125M+ papers
- Extracts and summarizes findings across multiple studies
- Best for: literature review and cross-paper synthesis
- Gap: no collaborative reading, no confusion detection, no peer routing

**SciSpace (https://typeset.io)**
- Deep PDF analysis, instant explanations, real-time collaborative annotation
- Chat with multiple PDFs simultaneously
- Closest to CoRead on collaboration — but still reactive (user asks)
- Gap: no proactive intervention, no instability detection, no orchestration

**Consensus (https://consensus.app)**
- Evidence-based answers from peer-reviewed research
- Best for: verifying claims against scientific literature
- Gap: search-focused, not a reading environment

**ResearchRabbit (https://researchrabbit.ai)**
- Visual paper relationship mapping, citation networks
- "Spotify for research papers" — recommendations from reading habits
- Gap: discovery tool, not a reading/comprehension tool

**Scite (https://scite.ai)**
- Smart citations — shows whether papers support, dispute, or mention a claim
- Gap: citation analysis only, not a reading environment

### Where CoRead Sits

```
                    SOLO ←————————————→ COLLABORATIVE
                      |                        |
REACTIVE              Anara, Elicit,        SciSpace
(user asks)           Consensus, Scite      (partial)
                      |                        |
PROACTIVE             —                     CoRead ← YOU ARE HERE
(system acts)
```

CoRead is the only tool in the proactive + collaborative quadrant.
This is the gap it fills. Every feature decision should defend this position.

### Design Decisions Inspired by Competitors

| Feature | Inspired by | CoRead's extension |
|---|---|---|
| Source-grounded answers | Anara | Grounding validation gate — abstain if ungrounded |
| File-scoped responses | Anara | Section-scoped (C_s) — even tighter than file-scoped |
| Collaborative annotation | SciSpace | + deduplication, + peer routing from annotations |
| Paper Q&A | Elicit, Anara | + proactive (no need to ask), + section-constrained |
| Citation finding | Anara | Agent 9 — proactive background on unfamiliar terms |

### What NOT to build (already solved elsewhere)
- Paper discovery / recommendation → ResearchRabbit, Litmaps
- Citation management → Zotero, Mendeley
- Literature review matrix → Elicit
- General paper Q&A → Anara (they do it better solo)

CoRead's value is in the collaborative + proactive space. Do not drift
into features that make it just another solo AI reading tool.

---

## Academic Related Work Context

For paper writing and design decisions grounded in HCI research:

### Mixed-Initiative Interaction
- **Horvitz (1999)** — Principles of Mixed-Initiative UIs. The foundational
  paper. Act when benefit exceeds cost of interruption. CoRead's D_s
  thresholds operationalize this expected utility criterion.
- **Fogarty et al. (2005)** — predicting interruptibility from behavioral
  sensors. Direct precedent for CoRead's implicit signal tier.
- **Iqbal & Bailey (2008)** — notification timing effects. Justifies the
  persistence window and 90s cooldown design.

### Collaborative Reading & Annotation
- **Marshall (1997)** — annotation as social construction. Annotations
  are coordination artifacts, not just personal notes.
- **Zyto et al. (2012)** — collaborative annotation in NB. Peer visibility
  into struggle is valuable but needs structure.
- **Fok et al. (2023)** — Scim paper skimming. Adaptive support is valued;
  CoRead extends this to the collaborative setting.
- **Kim et al. (2022)** — PaperEOS, just-in-time paper augmentation.
  Closest prior academic system; CoRead adds the coordination layer.

### Proactive AI Guidelines
- **Amershi et al. (2019)** — 18 guidelines for human-AI interaction.
  CoRead follows G1 (clear when AI acts), G4 (show confidence),
  G8 (support dismissal), G16 (encourage feedback).

**When making design decisions ask two questions:**
1. Does Anara or SciSpace already do this? If yes, how does CoRead do it
   better or differently in the collaborative context?
2. Does this align with what Horvitz or Amershi would recommend?

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Custom server via server.js for Socket.IO |
| Frontend | React 19 + TypeScript | Functional components + hooks only |
| Real-time | Socket.IO 4 | Room-based sessions per reading group |
| Auth | Next-Auth v4 | JWT-based sessions |
| Database | Prisma + Firebase | Prisma for relational data; Firebase for real-time/session |
| Storage | AWS S3 | PDF uploads via @aws-sdk/client-s3 |
| AI / LLM | GPT-4o (gpt-4o) via OpenAI SDK | Always use this exact model string |
| PDF Viewer | Apryse WebViewer (@pdftron/webviewer) | Primary viewer; XFDF for annotations |
| Eye tracking | WebGazer.js | Frozen stare detection; may be unavailable |
| PDF processing | pdfHeadingExtractor (src/lib) | Section chunking; also pymupdf-node |
| Grounding | Direct context injection | y = LLM(q | C_s) — NOT embedding RAG |
| Styling | Tailwind CSS v4 + Radix UI | Component primitives via @radix-ui |

---

## Architecture — 10 Agent System

Agents are independent coordination modules with single responsibilities.
They communicate through a shared session event bus, never directly.
All agents live in src/lib/agents/.

| ID | Agent File | Responsibility | Trigger |
|---|---|---|---|
| A1 | Agent1_UnderstandingDetection.ts | Computes D_s from signals; emits threshold events | Every 2s continuous |
| A2 | Agent2_CollaborationOrchestrator.ts | Routes reader to peer using role + D_s | D_s >= τ_high or A6 abstain |
| A3 | Agent3_DiscussionFacilitator.ts | Generates discussion prompts on group engagement | Section coverage + dwell |
| A4 | Agent4_AnnotationsAnalysis.ts | Detects duplicates; merges complementary notes | New annotation event |
| A5 | Agent5_StoryboardCurator.ts | Generates Session Log artifacts per participant | Session end (Phase III) |
| A6 | Agent6_ContentComprehension.ts | Section-constrained explanations; abstains if grounding fails | "Explain" click or A7 |
| A7 | Agent7_ImplicitAssistance.ts | Non-modal notification dispatch; cooldown + re-trigger | D_s >= τ_fire |
| A8 | Agent8_FactChecking.ts | Verifies peer explanation claims against source doc | Peer explanation submitted |
| A9 | Agent9_RelatedWorkAnalysis.ts | Proactive background + citations from annotation patterns | Unfamiliar term annotated |
| A10 | Agent10_RoleAllocation.ts | Assigns section responsibilities from Phase I reflections | Session start |

**Agent rules:**
- Lives in src/lib/agents/
- Implements the Agent interface (see src/lib/agents/aiCoordinationCore.ts)
- All activations logged — required for evaluation
- Events emitted to session event bus only — no direct agent-to-agent calls

---

## Signal Model

### Difficulty Score D_s Weights

```typescript
// IMPLICIT signals — always active via behavioral monitoring
const IMPLICIT_WEIGHTS = {
  rereadLoop:       0.28,   // scroll-back to same passage
  scrollRegression: 0.22,   // reverse scroll within section
  frozenStare:      0.18,   // WebGazer dwell > 2s on same line
  mouseJitter:      0.10,   // erratic mouse movement pattern
  dwellTime:        0.08,   // per second on same section
  contentDensity:   0.06,   // section complexity modifier
  decay:           -0.012,  // per second — natural D_s decay
};

// EXPLICIT signals — user-initiated amplification tier
const EXPLICIT_WEIGHTS = {
  stuckMarker:         0.28,  // user clicks "I am stuck"
  confusionHighlight:  0.22,  // user highlights as confusing
};
```

### Thresholds — NEVER CHANGE WITHOUT PAPER UPDATE

```typescript
const THRESHOLDS = {
  tau_fire:  0.72,   // notification triggered (A7)
  tau_high:  0.88,   // immediate peer routing (A2)
  cooldown:  90,     // seconds — re-trigger suppression after dismiss
  tau_e:     0.35,   // engagement stability — below = expert fluency
};
```

### Routing Logic

```
D_s >= tau_high                     → A2 peer routing (immediate)
D_s >= tau_fire AND < tau_high      → A7 notification → A6 explanation
all readers D_s >= tau_fire         → group study mode
E_s < tau_e (expert fluency)        → silence routing (suppress)
after cooldown + D_s still elevated → re-trigger notification
```

---

## RAG / Grounding System

CoRead does NOT use embedding-based RAG. Section text is cached by
pdfHeadingExtractor and passed directly as context C_s to GPT-4o.

```typescript
// Correct implementation
const response = await generateExplanation({
  query: userQuestion,
  context: currentSection.text,   // C_s — scoped to current section only
  model: 'gpt-4o',
});

// Grounding validation — MANDATORY before surfacing any explanation
const isGrounded = await validateGrounding(response, currentSection.text);
if (!isGrounded) {
  // Abstain — never surface an ungrounded explanation
  logIntervention({ type: 'grounding_failure', agentId: 'A6', ...context });
  return routeToPeer();  // offer peer routing instead
}
```

**Paper formula:** y = LLM(q | C_s)

Never call this "RAG" in comments — it is direct context injection, which
is architecturally and conceptually different from retrieval-augmented
generation.

---

## Three-Phase Framework

```
Phase I   Pre-Discussion Alignment
          ├── A10 assigns section responsibilities from reflections
          ├── Participants submit prior knowledge + reading goals
          └── Passive collab: prior session artifacts surfaced on join

Phase II  In-Session Orchestration  ← most of the system lives here
          ├── A1 continuous D_s monitoring (every 2s)
          ├── A7 notification dispatch at tau_fire
          ├── A6 section-constrained explanation on accept
          ├── A2 peer routing at tau_high or A6 abstain
          ├── A3 discussion prompt on sustained group engagement
          ├── A4 annotation deduplication on new annotation
          └── A9 proactive background on unfamiliar term annotation

Phase III Post-Session Knowledge Stabilization
          ├── A5 Session Log generation per participant
          ├── Collective Knowledge Base update
          └── Artifacts seeded into next session Phase I
```

---

## Firebase Data Model

```
sessions/{sessionId}/
  participants/{userId}/
    role: 'participant' | 'researcher'
    expertise: 'N' | 'I' | 'E'
    sectionAssignments: string[]
    dsHistory: { timestamp, value, sectionId }[]

  annotations/{annotationId}/
    userId, sectionId, text, type
    isDuplicate: boolean
    mergedWith: annotationId | null

  interventions/{interventionId}/
    type: 'notification' | 'peer_routing' | 'group_study' | 'silence'
    agentId: 'A1'–'A10'
    userId, sectionId, timestamp
    dsAtTrigger: number
    outcome: 'accepted' | 'dismissed' | 'resolved' | 'abstained'

  artifacts/
    sessionLog/{userId}
    collectiveKnowledgeBase/
```

---

## Evaluation Data — Keep These Numbers Accurate

Paper reports across 12 sessions (S1–S12):

| Metric | Value |
|---|---|
| Total interventions | 63 |
| Dismissal rate | 4.8% (3/63) |
| AI explanations generated | 21 |
| Grounding pass rate | 90.5% (19/21) |
| Peer routing events | 13 (10/12 sessions) |
| Discussion prompts surfaced | 12 (all 12 sessions) |
| Discussion prompts generating >5min talk | 10/12 |
| Group study mode activations | 1 (S4 only) |
| Silence suppressions | 14 |
| Deduplication events | 4 |

**If you add or change intervention logic, update the logging immediately.**
These numbers must stay consistent with what the paper reports.

---

## Coding Standards

```typescript
// TypeScript — always explicit types for agent events
interface InterventionEvent {
  agentId: 'A1' | 'A2' | 'A3' | 'A4' | 'A5' |
           'A6' | 'A7' | 'A8' | 'A9' | 'A10';
  type: InterventionType;
  userId: string;
  sectionId: string;
  dsAtTrigger: number;
  timestamp: number;
}

// Never use `any` — use `unknown` and narrow with type guards
// Always handle WebGazer being unavailable (graceful degradation)
// Always handle Firebase offline state (session continues without sync)
// Never block the reading interface — all UI is non-modal
// Always log before returning from any agent method
```

---

## Project File Structure

```
thesis-master/                       <- project root
├── CLAUDE.md                        <- you are here
├── server.js                        <- custom Next.js + Socket.IO server
├── package.json
├── prisma/                          <- Prisma schema + migrations
├── public/
│   └── lib/webviewer/               <- Apryse WebViewer assets (copied by npm script)
└── src/
    ├── app/                         <- Next.js App Router
    │   ├── page.tsx                 <- root page
    │   ├── layout.tsx
    │   ├── dashboard/
    │   ├── document/[id]/           <- main reading view
    │   ├── join-document/
    │   ├── study-admin/             <- study administration UI
    │   └── api/                     <- API routes
    │       ├── ai/                  <- general AI endpoint
    │       ├── ai-summary/          <- summary generation
    │       ├── annotations/         <- annotation CRUD
    │       ├── collaborative/       <- collaboration events
    │       ├── comprehension-check/
    │       ├── discussion-analysis/
    │       ├── documents/
    │       ├── fact-check/          <- A8
    │       ├── help-markers/
    │       ├── inline-definitions/
    │       ├── related-work/        <- A9
    │       ├── session-summary/     <- A5
    │       ├── socket/              <- Socket.IO HTTP handler
    │       ├── socketio/            <- Socket.IO upgrade handler
    │       ├── stuck-help/          <- A7 trigger endpoint
    │       ├── study-log/           <- evaluation logging
    │       ├── telemetry/           <- behavioral signal ingestion
    │       └── upload/              <- PDF upload (AWS S3)
    ├── components/                  <- React components
    │   ├── ApryseWebViewer.tsx      <- primary PDF viewer + XFDF annotations
    │   ├── ImplicitHelpCard.tsx     <- A7 non-modal notification
    │   ├── SmartHelpPanel.tsx       <- A6 explanation card
    │   ├── CollaborativeInsightsModal.tsx <- A2/A3 peer/group prompts
    │   ├── SessionSummaryPanel.tsx  <- A5 session log
    │   ├── EyeTrackingCalibration.tsx
    │   ├── ReflectionIntake.tsx     <- Phase I intake
    │   ├── SectionAssignmentPanel.tsx <- A10 role display
    │   ├── SystemFlowVisualizer.tsx <- debug/demo agent flow
    │   └── ui/                      <- shared Radix UI primitives
    ├── hooks/
    │   ├── useCollaboration.ts      <- Socket.IO session sync
    │   └── useAnalysisEngine.ts     <- behavioral signal collection
    ├── lib/
    │   ├── agents/
    │   │   ├── aiCoordinationCore.ts        <- agent registry + event bus
    │   │   ├── Agent1_UnderstandingDetection.ts
    │   │   ├── Agent2_CollaborationOrchestrator.ts
    │   │   ├── Agent3_DiscussionFacilitator.ts
    │   │   ├── Agent4_AnnotationsAnalysis.ts
    │   │   ├── Agent5_StoryboardCurator.ts
    │   │   ├── Agent6_ContentComprehension.ts
    │   │   ├── Agent7_ImplicitAssistance.ts
    │   │   ├── Agent8_FactChecking.ts
    │   │   ├── Agent9_RelatedWorkAnalysis.ts
    │   │   └── Agent10_RoleAllocation.ts
    │   ├── pdfHeadingExtractor.ts   <- section chunking for C_s context
    │   ├── chatAnalyzer.ts          <- chat signal extraction
    │   ├── eyeTracking.ts           <- WebGazer wrapper + degradation
    │   ├── studyLogger.ts           <- evaluation data logging
    │   ├── firebaseClient.js        <- Firebase client SDK
    │   ├── firebaseServer.js        <- Firebase Admin SDK
    │   └── prisma.ts                <- Prisma client
    └── utils/
        ├── cn.ts
        ├── contentDetector.ts
        ├── imageDetector.ts
        └── tableDetector.ts
```

---

## Common Commands

```bash
npm install              # install dependencies
npm run dev              # start dev server (copies WebViewer assets + runs custom server.js)
npm run build            # production build
npm run typecheck        # TypeScript check (run before committing)

# Note: uses live Firebase + AWS S3 — no local emulator required
# WebViewer assets are auto-copied from node_modules on each dev/build
```

---

## Terminology Rules — Always Exact

| Correct | Never use |
|---|---|
| CoRead | Co-Read, coread, COREAD |
| D_s | Ds, difficulty_score, instability_score |
| tau_fire / τ_fire | threshold, fire_threshold, tau1 |
| tau_high / τ_high | high_threshold, tau2 |
| timely intervention | proactive notification, alert |
| active orchestration | routing system, delegation |
| coordination instability | confusion, difficulty |
| y = LLM(q | C_s) | RAG, retrieval-augmented generation |
| Phase I / Phase II / Phase III | phase 1, stage 1, step 1 |
| section-constrained | scoped, limited, filtered |
| grounding validation | fact checking, verification |
| peer routing | peer help, forwarding to peer |
| group study mode | group mode, class mode |
| silence routing | suppression, no-op, skip |
| Session Log | session summary, notes export |
| Collective Knowledge Base | shared notes, group memory |

---

## Feature Quality Checklist

Run this before implementing any feature:

- [ ] Does this make two PhD researchers smarter together than they would be alone?
- [ ] Is every AI response grounded in the actual paper text — no generic outputs?
- [ ] Does the UI earn its place — nothing on screen the user doesn’t need right now?
- [ ] Is activation logging preserved so collaboration effectiveness is measurable?
- [ ] Would a researcher at MIT, CMU, or Oxford use this without feeling patronized?

**The system must evolve to be the best possible tool for expert researchers.
Thresholds, metrics, and agent behavior can and should be improved as we learn.**

---

## Paper Reference

**Title:** CoRead: Timely Intervention and Active Orchestration
for Collaborative Academic Reading



**Key citations (keep in sync with paper bib):**
- horvitz1999principles — mixed-initiative foundation
- fogarty2005predicting — interruptibility sensing
- iqbal2008effects — notification timing effects
- amershi2019guidelines — human-AI interaction guidelines
- braun2006thematic — thematic analysis method
- mcdonald2019reliability — ICR methodology
- papoutsaki2016webgazer — WebGazer eye tracking
- openai2024gpt4o — GPT-4o technical report
- kim2022papeos — just-in-time paper augmentation
- fok2023scim — paper skimming
- zyto2012successful — collaborative annotation
- bunt2007mixed — mixed-initiative personalization
- cooke2013interactive — team cognition
