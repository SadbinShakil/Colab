# AI Help Section Name Fix

## Problem
The "Smart Help Panel" was showing generic section names like `"Section simulated-section"` or `"Section 123"` instead of the human-readable names like "**Introduction**" or "**Methodology**".

## Root Cause
While the previous fix ensured `StruggleDetected` events carried the correct section name, it was getting **lost** in the notification pipeline.
1. `aiCoordinationCore` received the correct `sectionName`.
2. But it called `agent7.generateNotification` without passing the name.
3. `Agent7`'s `SmartNotification` object didn't even have a field to store `sectionName`.
4. So the final notification sent to the UI had `sectionId` but missing `sectionName`.
5. The UI fell back to: `` `Section ${sectionId}` ``.

## Fix Implemented

### 1. Updated `Agent7_ImplicitAssistance.ts`
- Added `sectionName` to the `SmartNotification` interface.
- Updated `generateNotification` to accept and store `sectionName`.

### 2. Updated `aiCoordinationCore.ts`
- Updated all `generateNotification` calls to pass `data.sectionName` alongside `sectionId`.

## Data Flow (Now Fixed)
1. **Struggle Event**: Contains `{ sectionId: 'h-1', sectionName: 'Introduction' }`
2. **Coordination Core**: Passes `'Introduction'` to Agent 7
3. **Agent 7**: Create notification `{ ..., sectionName: 'Introduction' }`
4. **UI**: Displays `notification.sectionName` → "**Introduction**"

## Verification
- Trigger a struggle (or simulate one).
- The "Smart Help Panel" header should now say "**Introduction**" (or whatever the section is).
- Implicit notifications will also say "You seem confused about **Introduction**".

## Implementation Files
- `src/lib/agents/Agent7_ImplicitAssistance.ts`
- `src/lib/agents/aiCoordinationCore.ts`
- `src/components/ApryseWebViewer.tsx` (Logic was correct, just needed the data)
