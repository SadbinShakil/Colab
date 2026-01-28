# 📄 UIST 2026 Paper Context: LitSense Framework
**Project Title:** LitSense: A Phased Human-AI Collaborative Framework for Academic Reading

---

## 🚀 Research Vision & Novelty
**LitSense** is a system designed to transform passive academic reading into an active, phased collaborative journey. It addresses two primary challenges in HCI:
1. **Knowledge Leakage:** Significant insights in peer discussions are often lost in ephemeral chat histories.
2. **Interaction Friction:** Users often struggle silently before seeking help.

The system uses a **Direct-to-Cognition** approach, leveraging eye-tracking and a multi-agent orchestration to proactively support users during a structured 4-phase research pipeline.

---

## � The 4-Phase System Flow
The system orchestrates the research session through four distinct stages:

### Phase 1: Reflection Analysis
- **Goal:** Establish a baseline understanding.
- **Mechanism:** Analyzes initial user interactions (paragraph focus, highlight density, and initial comments/questions).
- **Intelligence:** Builds a "Cognitive Profile" of the reader's existing knowledge and confusion zones.

### Phase 2: Dynamic Role Assignment
- **Goal:** Distribute expertise across a collaborative group.
- **Mechanism:** Based on Phase 1 data, the system assigns roles (e.g., "Methodology Expert," "Literature Reviewer") and specific paper sections to different peers.
- **UIST Novelty:** Automated division of labor based on real-time comprehension analysis.

### Phase 3: Collective Knowledge Sharing
- **Goal:** Persistence of insights.
- **Mechanism:** Real-time extraction of insights from chat. High-fidelity "definitions" and "aha moments" are automatically promoted to a **Collective Memory Sidebar**.
- **Tech:** Uses **RAG (Retrieval-Augmented Generation)** and **Cosine Similarity** to ensure entries are unique, accurate, and linked to PDF context.

### Phase 4: Implicit Collaboration & Proactive Help
- **Goal:** Zero-friction support.
- **Mechanism:** Combined Eye-tracking (Fixation Mapping) + Agent 1 (Struggle Detection).
- **Action:** If User A (Struggler) and User B (Proficient) are in the same room, the system proactively triggers a "Peer Match" notification to connect them.

---

## 🏗️ Technical Architecture

### Intelligence Layer (RAG + Vector Search)
- **Vector Embeddings:** PDF text segments, user chat messages, and wiki entries are embedded and stored.
- **RAG Implementation:** All AI responses (Agents 6, 8, 9) are grounded in the PDF content via **Cosine Similarity** lookup.
- **Fact-Checking:** Agent 8 validates peer claims by comparing chat embeddings against the paper's vector space.

### 👁️ Interaction Collection (The Biometric Loop)
- **Engine:** WebGazer.js integrated into the PDF canvas.
- **Data Points:** Gaze coordinates (x, y), Fixation duration (>2s), Saccade velocity, and Re-reading/Regression rates.
- **Mapping:** Coordinates are mapped to PDF Semantic Objects (Equations, Figures, Paragraphs).

### 🤖 The 9-Agent Orchestration
The system uses `aiCoordinationCore.ts` to manage specialized agents:
1. **Agent 1 (Understanding Detection):** Monitors signals (gaze, scrolling) to detect "Struggle State."
2. **Agent 2 (Collaboration Orchestrator):** Manages room state, sync, and peer matching.
3. **Agent 3 (Discussion Facilitator):** Analyzes chat to extract knowledge for the Wiki.
4. **Agent 4 (Annotations Analysis):** Interprets the intent behind highlights (e.g., confusion vs. importance).
5. **Agent 5 (Storyboard Curator):** Generates a visual "Research Journey" timeline.
6. **Agent 6 (Content Comprehension):** Provides deep, RAG-grounded explanations.
7. **Agent 7 (Implicit Assistance):** Triggers proactive UI help (toasts/sidebars) based on fixation.
8. **Agent 8 (Fact Checking):** Verifies peer claims against paper evidence.
9. **Agent 9 (Related Work Analysis):** Suggests 2-hop related works based on current context.

---

## �️ Feature Suite
- **Explainers:** Specialized Math (LaTeX), Table (Structured), and Image (Vision) tools.
- **Prerequisite Graph:** 1,400+ line module calculating domain expertise requirements.
- **Research Storyboard:** A visual timeline of the user's "Epiphany & Struggle" moments.
- **Session Reporting:** Comprehensive cognitive biometric analysis after the session.
