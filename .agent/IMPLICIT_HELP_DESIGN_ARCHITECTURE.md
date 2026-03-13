# implicit_help_design_architecture.md

## Overview: The "Helpful" Intelligence System
**Goal:** To create an AI assistance layer that feels like an intuitive, empathetic pair programmer—always aware, never intrusive, and helpful at the exact right moment.

A Google-engineered system does not rely on simple `if-else` rules (e.g., "if time > 30s"). Instead, it uses a **Probabilistic State Machine** that models the user's cognitive state based on multi-modal signals.

---

## 1. The Architecture: 3-Layer Intelligence Model

### Layer 1: Input Signals (The Senses)
The system aggregates raw, noisy data into meaningful "Atomic Events".

| Signal Source | Metric | Meaning |
|:---|:---|:---|
| **Eye Tracking** | **Fixation Cluster** | "User is staring at this specific paragraph." |
| **Eye Tracking** | **Regression Rate** | "User read this line, then looked back 3 times." (Confusion) |
| **Mouse** | **Micro-Jitter** | "Mouse is moving erratically in a small area." (Frustration/Deep Focus) |
| **Scroll** | **Velocity Change** | "Fast scroll -> Sudden Stop." (Finding something interesting) |
| **Interaction** | **Highlight/Select** | "User is actively engaging with this text." |

### Layer 2: Inference Engine (The Brain)
Raw signals are fed into a **Bayesian State Estimator** to update the user's "Cognitive State".

**States:** `Flow` | `Skimming` | `Deep Focus` | `Struggling` | `Distracted`

**Logic Example (Weighted Probability):**
```typescript
let struggleProbability = 0;

// 1. Dwell Factor (Base)
if (timeOnSection > 30s) struggleProbability += 0.4; 

// 2. Loop Factor (Multiplier)
if (revisitCount > 3) struggleProbability += 0.3;

// 3. Complexity Factor (Context)
// E.g. If the text has high "lexical density" (many math terms)
if (sectionComplexity === 'high') struggleProbability += 0.2;

// 4. Past Behavior (Personalization)
// If this user usually reads fast but is slow here:
if (currentSpeed < userAverageSpeed * 0.5) struggleProbability += 0.2;

// Decision Threshold
if (struggleProbability > 0.85) return 'HIGH_CONFIDENCE_STRUGGLE';
```

### Layer 3: Interaction Layer (The Intervention)
The system uses **Progressive Disclosure** to offer help without breaking flow.

1.  **Level 1 (Ambient):** *No notification.* Maybe the section border glows faintly. The system is "ready."
2.  **Level 2 (Nudge):** *Context Card.* A small, pill-shaped card slides up (bottom-right). "Need a breakdown?"
3.  **Level 3 (Intervention):** *Full Modal.* Only if the user asks or if the struggle is critical (e.g., repeating an error).

---

## 2. The Implementation Logic: "Agent 7 + Agent 1"

### Step 1: Detection (Agent 1)
*   **Trigger:** Runs on every `fixation` or `interaction` event.
*   **Debounce:** Uses a `lastAnalysisTime` map to prevent analyzing the same section more than once every 10 seconds.
*   **Context Check:** Only analyzes the *active* section (where the eyes are).
*   **Result:** Emits a `struggle-detected` event ONLY if the calculated `struggleScore` crosses the threshold AND the system is not in a "Cooldown" state.

### Step 2: Content Generation (The "What")
Once struggle is detected, what do we show? A Google system doesn't just say "stuck?". It analyzes the **Content Type**:

*   **Scenario A: Math/Equation**
    *   *AI Action:* "Explain this formula."
    *   *UI:* "This equation looks dense. Want to see the variable definitions?"
    
*   **Scenario B: Dense Theory**
    *   *AI Action:* "Simplify abstraction."
    *   *UI:* "Three other researchers found this concept tricky. Here's a simpler analogy."
    
*   **Scenario C: Code/Algorithm**
    *   *AI Action:* "Visualize process."
    *   *UI:* "Want to see a step-by-step trace of this algorithm?"

### Step 3: The "Ghost" Layer (Collaborative Intelligence)
The system leverages **Collective Memory**. It checks: "Did *others* struggle here?"
*   If **Yes**: "You're not alone. 4 others paused here." (Validates the user's feeling).
*   If **No**: "This is usually clear. Maybe check the prerequisites?" (Redirects focus).

---

## 3. UI/UX Specifications (Google Material 3)
*   **Motion:** Entrance must be spring-based (`stiffness: 300`), sliding up from the bottom.
*   **Sound:** A silent, haptic "tick" (if on mobile) or no sound at all. Visuals only.
*   **Dismissal:** Swipe down or click "X". The system learns: "User refused help here. Don't ask again for 10 minutes."

## 4. Code Structure Recommendation

```typescript
// ImplicitHelpManager.ts

interface HelpStrategy {
  type: 'breakdown' | 'connect' | 'encourage';
  trigger: (state: UserState) => boolean;
  content: (context: SectionContext) => HelpContent;
}

const strategies: HelpStrategy[] = [
  {
    type: 'breakdown',
    trigger: (s) => s.interactionType === 'math_dwell',
    content: (ctx) => ({ title: "Formula Breakdown", icon: "function" })
  },
  {
    type: 'connect',
    trigger: (s) => s.struggleSeverity > 0.9 && peerAvailable,
    content: (ctx) => ({ title: "Ask Emma", icon: "user-group" })
  }
];
```
