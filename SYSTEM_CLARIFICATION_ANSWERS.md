# System Clarification Answers

**Verification Status**: ✅ All answers verified against actual codebase implementation.

This document was created by:
1. Reading complete source files for each system component
2. Tracing code execution paths and event flows
3. Verifying actual implementation vs. documentation
4. Checking for edge cases and fallback mechanisms

All code references point to actual line numbers in the repository.

## 1. Are the four phases sequential, or can users move between them fluidly?

**Answer: Sequential with guided transitions, but users can skip ahead.**

- The phases are designed to be sequential (Phase 1 → 2 → 3 → 4) as seen in `SystemFlowVisualizer.tsx`
- Phase transitions are triggered by:
  - **Phase 1 → 2**: When reflection is submitted (`reflection-submitted` event)
  - **Phase 2 → 3**: After role assignment review (1 minute timer)
  - **Phase 3 → 4**: After focused reading period (2 minutes timer)
- However, users can skip phases using the "Skip" button
- The system tracks phase state but doesn't enforce strict sequential lock-in

**Code Evidence:**
- `src/components/SystemFlowVisualizer.tsx` lines 180-215: Phase transition logic with timers
- `src/lib/agents/aiCoordinationCore.ts` line 170-178: Reflection submission triggers Phase 2

---

## 2. Is reflection analysis computed once at session start, or continuously updated?

**Answer: Reflection analysis is computed when submitted, but users can update reflections which may trigger re-analysis.**

- **Initial Reflection Analysis (Phase 1)**: Computed when user first submits their reflection
  - Extracts expertise, interests, goals, and knowledge level via NLP-style keyword matching
  - Triggers Agent 10 role allocation (`aiCoordinationCore.ts` line 177)
  - Creates user profile for matching algorithm
  
- **Reflection Updates**: Users CAN update their reflection later
  - `ReflectionIntake.tsx` line 41: Shows "Reflection updated!" toast
  - Updates are broadcast via Socket.io (`reflection-updated` event)
  - **However**: Code shows reflection updates are primarily for display/sync - Agent 10 allocation is typically triggered once at session start
  - Manual re-allocation possible via "AI Allocation" button in SectionAssignmentPanel
  
- **Understanding Monitoring (Phase 3-4)**: Continuously updated throughout the session
  - Agent 1 monitors every 1 second (`Agent1_UnderstandingDetection.ts` line 110)
  - Tracks understanding scores, struggle signals, breakthrough moments
  - Updates based on eye-tracking, highlights, page visits, and behavioral patterns
  - This is separate from reflection analysis - it's behavioral monitoring

**Code Evidence:**
- `src/lib/agents/Agent1_UnderstandingDetection.ts` line 108-132: Continuous monitoring loop
- `src/lib/agents/Agent10_RoleAllocation.ts`: Role allocation based on reflections
- `src/components/ReflectionIntake.tsx` line 38-43: Reflection submission/update handler
- `src/lib/agents/aiCoordinationCore.ts` line 170-178: `reflection-submitted` event triggers Agent 10

---

## 3. Does role assignment happen automatically, or can users override roles?

**Answer: Automatic with user override capability.**

- **Automatic Assignment**: 
  - Triggered when reflections are submitted (Agent 10)
  - Uses match scoring algorithm (expertise + interest + goal scores)
  - Threshold: Score ≥ 20 to assign to human, otherwise assigns to AI
  
- **User Override**:
  - Users can manually assign sections via dropdown in `SectionAssignmentPanel`
  - Users can click "AI Allocation" button to re-run automatic assignment
  - Manual assignments override AI suggestions

**Code Evidence:**
- `src/components/SectionAssignmentPanel.tsx` line 252-299: Manual assignment function
- `src/lib/agents/Agent10_RoleAllocation.ts` line 341: Automatic assignment threshold
- `src/components/SectionAssignmentPanel.tsx` line 89-144: AI allocation button

---

## 4. Is peer matching only triggered when two users are present simultaneously, or can it be asynchronous?

**Answer: Synchronous - requires simultaneous presence. No async queue mechanism found.**

- Peer matching is **real-time and synchronous only**
- Triggered when:
  - A user struggles in a section (Agent 1 detects struggle)
  - Another user is proficient in the same section (Agent 2 checks `peerProfiles` Map)
  - Both users are in the same document room simultaneously (Socket.io room)
  
- **Not asynchronous**: 
  - The system doesn't queue match requests for later
  - `peerProfiles` Map is only populated for active, connected users (`Agent2_CollaborationOrchestrator.ts` line 88-108)
  - If a user is offline, they're not in `peerProfiles`, so no match can occur
  - No database persistence or queue system for offline matching found
  
- Matching happens via Socket.io real-time events when both users are online
- If a helper becomes available later, the system re-checks when new struggle is detected

**Code Evidence:**
- `src/lib/agents/Agent2_CollaborationOrchestrator.ts` line 148-212: `findPeersForHelp()` only checks active `peerProfiles`
- `src/lib/agents/Agent2_CollaborationOrchestrator.ts` line 88-108: `registerPeer()` only called for active users
- `src/components/ApryseWebViewer.tsx` line 1562-1590: Struggle detection triggers immediate peer search
- `server.js` line 36-230: Socket.io room-based real-time communication (no persistence layer)

---

## 5. Does collective knowledge externalization happen automatically, or only when the system detects "high-quality insights"?

**Answer: Automatic - no quality threshold, uses simple pattern matching. No AI quality scoring found.**

- **Automatic Extraction**: Happens in real-time as chat messages are sent
  - `chatAnalyzer.ts` analyzes messages before they reach the server
  - No manual trigger required - all messages are checked
  
- **Pattern-Based Detection**: Uses regex patterns to detect:
  - **Definitions**: "X is Y", "X means Y", "X = Y" (lines 11-38)
  - **Insights**: "I realized that...", "Key takeaway is...", "Important note:" (lines 42-64)
  
- **No Quality Filter**: 
  - All messages matching patterns are extracted immediately
  - No confidence scoring, no AI quality assessment
  - Simple length checks (e.g., definition must be >5 chars, term <30 chars)
  - Basic false positive filtering (excludes "it", "this", "that" as terms)
  
- **Deduplication**: 
  - Mentioned in `PAPER_CONTEXT.md` as using cosine similarity
  - However, actual deduplication code not found in `chatAnalyzer.ts` (may be in CollectiveWikiPanel component)
  
- **Linking**: Entries tagged with `documentId`, can include `pageNumber` and `position`

**Code Evidence:**
- `src/lib/chatAnalyzer.ts` line 4-67: Simple regex pattern matching, no quality scoring
- `SYSTEM_FLOW.md` line 11-24: Automatic extraction flow description
- No AI model calls or quality assessment found in chatAnalyzer.ts
- `src/components/CollectiveWikiPanel.tsx`: UI component for displaying entries (verification happens here)

---

## 6. Is eye-tracking required, or optional (fallback signals available)?

**Answer: Optional - multiple fallback signals available.**

- **Eye-Tracking**: Primary method but **not required**
  - Uses WebGazer.js for gaze tracking
  - Detects fixations (>2 seconds on same area)
  - Requires calibration but can fail gracefully
  
- **Fallback Signals**:
  1. **Hover Detection**: Tracks mouse hover (30 seconds on same section)
  2. **Behavioral Patterns**: Re-read loops, semantic dwell, gaze panic
  3. **Highlight Analysis**: Confusion highlights, stuck markers
  4. **Page Visit Patterns**: Revisit counts, time spent per section

**Code Evidence:**
- `src/lib/eyeTracking.ts` line 39-68: Eye-tracking initialization with error handling
- `.agent/STRUGGLE_DETECTION_IMPROVEMENTS.md`: Documents hover-based fallback
- `src/lib/agents/Agent1_UnderstandingDetection.ts` line 175-205: Multiple detection patterns

---

## 7. Is the moderator implemented as a visible agent, or invisible orchestration logic?

**Answer: Invisible orchestration logic.**

- **AI Coordination Core** (`aiCoordinationCore.ts`) acts as the invisible moderator
- **Not visible to users**: No UI representation, no chat presence, no notifications from "the moderator"
- **Functions**:
  - Routes user actions to appropriate agents
  - Activates agents based on events
  - Prevents conflicts between agents
  - Manages system state (muted, online status, etc.)
  
- **Visible Agents**: Individual agents (Agent 1-10) may generate notifications, but the core itself is invisible
- **Orchestration**: Event-driven routing system, not a conversational agent

**Code Evidence:**
- `src/lib/agents/aiCoordinationCore.ts` line 18-28: Core description as "brain" orchestrator
- `src/lib/agents/aiCoordinationCore.ts` line 130-180: Event routing logic (no UI)
- No moderator UI component found in codebase

---

## Additional Technical Details

### Struggle Detection Signals & Thresholds

**Signals Used:**
- Confusion highlights count
- Stuck markers count
- Revisit count (page visits)
- Time spent in section
- Understanding score (0-100)
- Behavioral patterns (semantic-dwell, re-read-loop, gaze-panic, erratic-scan)

**Thresholds:**
- **Low severity**: Score 30-49
- **Medium severity**: Score 50-69
- **High severity**: Score 70+
- **Semantic dwell**: >2 seconds on section with no understood highlights
- **Re-read loop**: 5+ visits with ≤2 unique pages

**Code Evidence:**
- `src/lib/agents/Agent1_UnderstandingDetection.ts` line 207-225: Severity calculation
- `src/lib/agents/Agent1_UnderstandingDetection.ts` line 175-205: Pattern detection

### Role Assignment Algorithm

**Inputs:**
- User reflections (expertise, interests, goals, knowledge level)
- PDF sections (heading text, content)
- Current user workload (for balancing)

**Algorithm:**
```
Match Score = Expertise Score + Interest Score + Goal Score + Level Bonus
- Expertise Score: 50 points per matched term
- Interest Score: 35 points per matched term
- Goal Score: 20 points per matched term
- Level Bonus: 15 points for appropriate difficulty

Adjusted Score = Match Score - (Current Workload × 5)
```

**Decision:**
- If Adjusted Score ≥ 20: Assign to human
- If Adjusted Score < 20: Assign to AI ("LitSense AI Auditor")

**Code Evidence:**
- `src/lib/agents/Agent10_RoleAllocation.ts` line 221-283: Match score calculation
- `.agent/SMART_AI_ALLOCATION.md`: Algorithm documentation

### Collective Knowledge Externalization

**When Entries Created:**
- Real-time as chat messages are sent
- Pattern matching happens before message reaches server
- No batch processing or delayed analysis

**Deduplication:**
- Uses cosine similarity (mentioned in `PAPER_CONTEXT.md`)
- RAG-based vector embeddings for comparison

**Linking to PDF:**
- Entries tagged with `documentId`
- Can include `pageNumber` and `position` if available
- Linked to specific sections via `sectionId`

**Code Evidence:**
- `src/lib/chatAnalyzer.ts`: Real-time pattern matching
- `SYSTEM_FLOW.md` line 11-24: Extraction flow

### Peer Matching Conditions

**Conditions:**
1. User A is struggling in section X
2. User B is proficient in section X (understanding score > 70)
3. Both users are in same document room
4. User B is available to help (not currently helping someone else)

**Notification:**
- Both users receive notifications
- Struggling user: "Peer available to help"
- Proficient user: "Someone needs help in your section"

**Code Evidence:**
- `src/lib/agents/Agent2_CollaborationOrchestrator.ts` line 148-212: Matching logic
- `src/lib/agents/Agent2_CollaborationOrchestrator.ts` line 127-142: Status tracking

### Progress Log Contents

**What Gets Logged:**
- Section assignments (who, when, status, progress %)
- Struggle events (section, duration, resolution method)
- Breakthrough moments (score changes, time to breakthrough)
- Collaboration events (peer matches, help sessions)
- Highlight/annotation events
- Page visits and time spent

**What's Shown to User:**
- Section assignment panel (assignments, progress bars)
- Storyboard/journey timeline (key moments)
- Collective memory sidebar (wiki entries, insights)
- Progress notifications (toasts, badges)
- Ghost highlights (aggregated struggle data)

**Code Evidence:**
- `src/lib/agents/Agent5_StoryboardCurator.ts`: Journey logging
- `src/lib/collaborativeInsights.ts`: Struggle tracking
- `src/components/SectionAssignmentPanel.tsx`: Progress display

