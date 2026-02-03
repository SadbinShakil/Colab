# Collective Reflections Fix

## Problem
The "Collective Reflections" section was showing "INITIALIZING REFLECTION..." even after users shared their reflections. The reflection count showed "0/2 Syllabled" instead of updating.

## Root Cause
The **server-side Socket.io handler was missing** for `'reflection-updated'` events.

### Data Flow (Before Fix)
1. ✅ User submits reflection in `ReflectionIntake` component
2. ✅ Client calls `broadcastReflection(reflection)` (line 7280 in ApryseWebViewer.tsx)
3. ✅ Socket emits `'reflection-updated'` to server (line 115 in useRealtimeHighlights.ts)
4. ❌ **SERVER IGNORES IT** - no handler exists in server.js
5. ❌ Other users never receive the reflection
6. ❌ UI shows "INITIALIZING REFLECTION..." forever

### Data Flow (After Fix)
1. ✅ User submits reflection
2. ✅ Client broadcasts reflection via Socket.io
3. ✅ **Server receives and broadcasts to all other users** (NEW!)
4. ✅ Other users receive `'reflection-updated'` event
5. ✅ Client listener updates `collaboratorReflections` Map (line 381-385)
6. ✅ UI displays the actual reflection content

## Fix Applied
Added the missing socket handler in `server.js` (line ~170):

```javascript
// ✅ ADD: Handle Reflection Updates
socket.on('reflection-updated', (data) => {
  console.log(`🧠 [Server] Reflection update from ${data.userName}:`, {
    userId: data.userId,
    type: data.type,
    contentLength: data.content?.length || 0
  })

  // Broadcast to all OTHER users in the same document
  socket.to(data.documentId).emit('reflection-updated', data)
  console.log(`✅ [Server] Reflection broadcasted to room: ${data.documentId}`)
})
```

## Testing Steps
1. **IMPORTANT**: Restart the dev server (`npm run dev`) for server.js changes to take effect
2. Open the app in two browser windows (or incognito + normal)
3. In Window 1: Click the floating Brain icon → Submit a reflection
4. In Window 2: Check the "Collective Reflections" section in the sidebar
5. **Expected**: Window 2 should show Window 1's reflection with their name and content
6. **Expected**: Count should update from "0/2" to "1/2 Syllabled"

## Console Logs to Verify
When a reflection is submitted, you should see:

**Submitting User (Window 1):**
```
📝 Reflection submitted: { type: 'text', content: '...' }
📡 Broadcasting reflection: { type: 'text', content: '...' }
```

**Server:**
```
🧠 [Server] Reflection update from user 2: { userId: 'user2', type: 'text', contentLength: 45 }
✅ [Server] Reflection broadcasted to room: doc-123
```

**Receiving User (Window 2):**
```
🧠 Received remote reflection update: { userId: 'user2', userName: 'user 2', type: 'text', content: '...' }
🧠 Received remote reflection in UI { userId: 'user2', ... }
```

## Files Modified
1. `server.js` - Added `'reflection-updated'` socket handler

## Related Code (Already Working)
- `src/app/hooks/useRealtimeHighlights.ts` - Client-side broadcast function (line 112-123)
- `src/components/ApryseWebViewer.tsx` - Reflection submission (line 7276-7282)
- `src/components/ApryseWebViewer.tsx` - Remote reflection listener (line 377-391)
- `src/components/ApryseWebViewer.tsx` - UI display (line 5843-5880)
