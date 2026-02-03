# Testing the Improved Struggle Detection

## Quick Test Guide

### Option 1: Test with Eye Tracking (Most Accurate)

1. **Start Eye Tracking**
   - Look for the "Start Eye Tracking" button in the viewer
   - Click it and allow camera access
   - Complete the calibration by clicking all the dots

2. **Test Fixation Detection**
   - Open any PDF document
   - Stare at a specific paragraph for 2-3 seconds
   - Watch the console for: `👁️ [Fixation] User staring at "..."`
   - After a few fixations, you should see a notification

3. **What to Expect**
   - Notification will show the actual text you were looking at
   - Example: "It looks like you're spending time on: 'The transformer architecture relies on self-attention mechanisms...'"
   - Click "Show Options" to get AI help
   - Click "Visualize" to highlight the section

### Option 2: Test with Hover (No Hardware Needed)

1. **Just Move Your Mouse**
   - Open any PDF document
   - Hover your mouse over a section
   - Keep it there for 30 seconds (reduced from 60!)

2. **Watch the Console**
   - You'll see: `⏱️ [Hover Dwell] Threshold reached for "Section Name"`
   - And: `📝 [Hover Dwell] Text context: "actual text..."`

3. **What to Expect**
   - After 30 seconds, notification appears
   - Shows the actual text from that section
   - Offers help options

### Option 3: Test Agent 1 Pattern Detection

1. **Trigger Semantic Dwell**
   - Stay on a page for 2+ seconds
   - Don't highlight anything as "understood"
   - Agent 1 will detect this pattern

2. **Trigger Re-read Loop**
   - Visit the same 2-3 pages repeatedly
   - Agent 1 will detect you're stuck

3. **Watch the Console**
   - Look for: `🌉 [ApryseWebViewer] Bridging struggle event to Core`
   - Then: `🔍 [AI Core] Struggle detected for user...`

## Console Logs to Watch For

### Successful Eye Tracking Flow:
```
👁️ [Fixation] User staring at "..." in Section Name
🌉 [ApryseWebViewer] Bridging struggle event to Core
🔍 [AI Core] Struggle detected for user X in section Y
💡 [Agent 7] Generating notification with text context
```

### Successful Hover Flow:
```
⏱️ [Hover Dwell] Threshold reached for "Section Name"
📝 [Hover Dwell] Text context: "actual text..."
🔍 [AI Core] Struggle detected for user X in section Y
```

### Successful Agent 1 Flow:
```
🤖 [Agent 1] Understanding Detection activated
🌉 [ApryseWebViewer] Bridging struggle event to Core
🔍 [AI Core] Struggle detected for user X
```

## Troubleshooting

### "No notifications appearing"
- Check if notifications are snoozed (look for snooze indicator)
- Check if system is "fully online" (past reflection phase)
- Look for deduplication logs: `🔕 [...] Ignoring ... - already notified`

### "Eye tracking not working"
- Make sure you completed calibration
- Check camera permissions
- Look for WebGazer errors in console

### "Hover not working"
- Make sure you're hovering for full 30 seconds
- Check that mouse is over the PDF, not UI elements
- Look for: `[Hover Tracking] Error:` in console

### "Text extraction failing"
- Check for: `PDF text extraction failed` in console
- System will fall back to DOM text extraction
- This is normal and expected

## Expected Notification Format

**Before (Generic):**
> "This section seems tricky. How can I help?"

**After (Specific):**
> "It looks like you're spending time on: 'The transformer architecture relies on self-attention mechanisms to process sequences in parallel, unlike recurrent neural networks which process sequentially...'. How can I help?"

## Performance Notes

- **Eye tracking**: Very accurate, triggers in 2 seconds
- **Hover tracking**: Good accuracy, triggers in 30 seconds
- **Agent 1 patterns**: Varies, depends on behavior patterns
- **All methods**: Include actual text context for better AI help

## Next Actions After Notification

1. **Click "Show Options"** → Opens AI help panel with context
2. **Click "Visualize"** → Highlights the struggling section
3. **Wait for peer suggestions** → If others can help, you'll be notified
4. **Dismiss** → Marks section as handled (won't notify again)

## Tips for Best Results

1. **Enable eye tracking** for most accurate detection
2. **Read naturally** - don't try to game the system
3. **Use highlights** - mark sections as "understood" when you get them
4. **Check console** - lots of helpful debug info
5. **Be patient** - system needs a few signals to be confident

## Success Criteria

✅ You should see:
- Notifications with actual text you were reading
- Specific section names, not just "Page X"
- Relevant AI help based on the text
- Peer suggestions when available
- No duplicate notifications for same section

❌ You should NOT see:
- Generic "this seems hard" messages
- Notifications for sections you already understood
- Spam notifications every few seconds
- Notifications without text context
