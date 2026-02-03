# Fake Image Help Popup - Issue and Solution

## 🎯 Problem Identified

**User Report:** The "Analyze Diagram?" popup is showing fake/hardcoded text:
- **Title:** "Analyze Diagram?"
- **Message:** "I can break down \"Fig 1\" and explain the architecture flow."
- **Issue:** It should detect the ACTUAL image/figure being hovered over and offer help based on that specific graphic

**Screenshot Evidence:** Popup shows generic "Fig 1" and "architecture flow" text regardless of what image is actually being viewed.

---

## 🔍 Root Cause

**File:** `src/components/ApryseWebViewer.tsx` (Lines 6837-6840)

```typescript
<h4 className="font-bold text-sm text-gray-800">Analyze Diagram?</h4>
<p className="text-xs text-gray-500 mt-1 leading-relaxed">
    I can break down "Fig 1" and explain the architecture flow.
</p>
```

**Problems:**
1. ❌ Hardcoded "Fig 1" reference
2. ❌ Hardcoded "architecture flow" description
3. ❌ No detection of actual image content
4. ❌ No extraction of real figure caption
5. ❌ Generic message for all images/diagrams

---

## ✅ Solution Design

### How It Should Work:

1. **Detect Image Hover/Gaze**
   - User hovers over or looks at an image/figure/table/diagram
   - System detects the specific graphic element

2. **Extract Real Information**
   - Get the actual figure number (e.g., "Figure 3", "Table 2")
   - Extract the caption text
   - Identify the type (diagram, chart, table, photo, etc.)
   - Get the page number

3. **Generate Contextual Offer**
   - Show popup with REAL figure information
   - Offer help based on actual content type
   - Use extracted caption for context

4. **Provide Real Analysis**
   - When user clicks "Yes, Explain"
   - Extract the actual image
   - Send to AI with real caption and context
   - Get specific explanation for THAT graphic

---

## 🔧 Implementation Steps

### Step 1: Create Image Detection System

**New File:** `src/lib/imageDetector.ts`

```typescript
export interface DetectedImage {
    type: 'figure' | 'table' | 'diagram' | 'chart' | 'photo' | 'equation'
    number: string  // e.g., "Figure 3", "Table 2"
    caption: string  // Actual caption text
    page: number
    boundingBox: {
        x: number
        y: number
        width: number
        height: number
    }
    imageData?: string  // Base64 encoded image
}

export class ImageDetector {
    private documentViewer: any

    constructor(documentViewer: any) {
        this.documentViewer = documentViewer
    }

    /**
     * Detect if coordinates are over an image
     */
    async detectImageAtPoint(x: number, y: number, page: number): Promise<DetectedImage | null> {
        try {
            const doc = this.documentViewer.getDocument()
            
            // 1. Get page text to find captions
            const pageText = await doc.loadPageText(page)
            
            // 2. Look for figure/table patterns near the coordinates
            const caption = this.findCaptionNearPoint(pageText.items, x, y)
            
            // 3. Extract image data if available
            const imageData = await this.extractImageAtPoint(page, x, y)
            
            if (caption || imageData) {
                return {
                    type: this.classifyImageType(caption),
                    number: this.extractFigureNumber(caption),
                    caption: caption || 'Visual element',
                    page,
                    boundingBox: { x, y, width: 0, height: 0 },
                    imageData
                }
            }
            
            return null
        } catch (error) {
            console.error('Error detecting image:', error)
            return null
        }
    }

    /**
     * Find caption text near a point
     */
    private findCaptionNearPoint(textItems: any[], x: number, y: number): string {
        // Look for text items with "Figure", "Table", "Fig.", etc.
        const captionPatterns = /^(Figure|Fig\.|Table|Chart|Diagram)\s+\d+/i
        
        // Find items within a reasonable distance
        const nearbyItems = textItems.filter(item => {
            const distance = Math.sqrt(
                Math.pow(item.x - x, 2) + Math.pow(item.y - y, 2)
            )
            return distance < 200  // Within 200 units
        })
        
        // Look for caption patterns
        for (const item of nearbyItems) {
            if (captionPatterns.test(item.str)) {
                // Found a caption, get the full text
                return this.getFullCaption(textItems, item)
            }
        }
        
        return ''
    }

    /**
     * Get full caption text (multiple lines)
     */
    private getFullCaption(textItems: any[], startItem: any): string {
        // Get all items on same line and following lines
        const captionItems = textItems.filter(item => 
            Math.abs(item.y - startItem.y) < 20 &&  // Same line or close
            item.x >= startItem.x - 50  // Reasonable horizontal range
        )
        
        return captionItems
            .sort((a, b) => a.x - b.x)
            .map(item => item.str)
            .join(' ')
            .trim()
            .substring(0, 200)  // Limit length
    }

    /**
     * Extract figure number from caption
     */
    private extractFigureNumber(caption: string): string {
        const match = caption.match(/(Figure|Fig\.|Table|Chart|Diagram)\s+(\d+)/i)
        return match ? `${match[1]} ${match[2]}` : 'Visual'
    }

    /**
     * Classify image type based on caption
     */
    private classifyImageType(caption: string): DetectedImage['type'] {
        const lower = caption.toLowerCase()
        if (lower.includes('table')) return 'table'
        if (lower.includes('chart')) return 'chart'
        if (lower.includes('diagram')) return 'diagram'
        if (lower.includes('equation')) return 'equation'
        if (lower.includes('figure') || lower.includes('fig.')) return 'figure'
        return 'photo'
    }

    /**
     * Extract actual image data at coordinates
     */
    private async extractImageAtPoint(page: number, x: number, y: number): Promise<string | undefined> {
        // This would use Apryse's image extraction API
        // For now, return undefined - implement based on Apryse docs
        return undefined
    }
}
```

---

### Step 2: Update Image Help Popup

**File:** `src/components/ApryseWebViewer.tsx`

**Replace lines 6837-6840 with:**

```typescript
<h4 className="font-bold text-sm text-gray-800">
    Analyze {imageHelpPrompt.imageInfo?.number || 'Diagram'}?
</h4>
<p className="text-xs text-gray-500 mt-1 leading-relaxed">
    {imageHelpPrompt.imageInfo?.caption 
        ? `I can explain: "${imageHelpPrompt.imageInfo.caption.substring(0, 80)}..."`
        : 'I can help you understand this visual element.'}
</p>
```

---

### Step 3: Integrate Image Detection

**In ApryseWebViewer.tsx, add:**

```typescript
import { ImageDetector, type DetectedImage } from '@/lib/imageDetector'

// State for image help
const [imageHelpPrompt, setImageHelpPrompt] = useState<{
    visible: boolean
    x: number
    y: number
    imageInfo: DetectedImage | null
} | null>(null)

// Initialize image detector
const imageDetectorRef = useRef<ImageDetector | null>(null)

useEffect(() => {
    if (webViewerInstance?.Core?.documentViewer) {
        imageDetectorRef.current = new ImageDetector(
            webViewerInstance.Core.documentViewer
        )
    }
}, [webViewerInstance])

// Detect image on hover/gaze
const handleImageHover = async (x: number, y: number, page: number) => {
    if (!imageDetectorRef.current) return
    
    const imageInfo = await imageDetectorRef.current.detectImageAtPoint(x, y, page)
    
    if (imageInfo) {
        setImageHelpPrompt({
            visible: true,
            x: x + 20,
            y: y + 20,
            imageInfo
        })
    }
}
```

---

### Step 4: Hook Up to Eye Tracking

**In the eye tracking fixation listener:**

```typescript
eyeTracker.setFixationListener((text, x, y, page) => {
    // ... existing code ...
    
    // Check if hovering over an image
    handleImageHover(x, y, page)
})
```

---

### Step 5: Real AI Analysis

**When user clicks "Yes, Explain":**

```typescript
onClick={async () => {
    setImageHelpPrompt(null)
    
    const imageInfo = imageHelpPrompt?.imageInfo
    if (!imageInfo) return
    
    toast.success(`Analyzing ${imageInfo.number}...`, { icon: "🧠" })
    
    // Send REAL image data to AI
    const response = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question: `Please explain this visual element: ${imageInfo.caption}`,
            imageData: imageInfo.imageData,
            imageType: imageInfo.type,
            documentTitle: documentTitle,
            userId: userId,
            userName: userName
        })
    })
    
    const data = await response.json()
    
    // Show explanation in storyboard or dedicated panel
    setImageExplainerText(data.response.answer)
    setShowImageExplainer(true)
}}
```

---

## 📊 Data Flow

```
User hovers/gazes at image
    ↓
ImageDetector.detectImageAtPoint(x, y, page)
    ↓
Extract from PDF:
  ├─ Find caption text (Figure X, Table Y)
  ├─ Get full caption description
  ├─ Classify type (diagram, chart, table)
  ├─ Extract image data (if available)
  └─ Get bounding box
    ↓
Show popup with REAL information:
  "Analyze Figure 3?"
  "I can explain: 'Proposed system architecture showing...'"
    ↓
User clicks "Yes, Explain"
    ↓
Send to AI with:
  - Real caption
  - Image data
  - Context
    ↓
Display specific explanation
```

---

## ✅ Expected Behavior

**Before (Fake):**
- ❌ Always shows "Fig 1"
- ❌ Always says "architecture flow"
- ❌ Generic for all images

**After (Real):**
- ✅ Shows actual figure number ("Figure 3", "Table 2")
- ✅ Shows real caption text
- ✅ Specific to each image
- ✅ Accurate AI analysis based on actual content

---

## 🎯 Example Outputs

### Example 1: Hovering over Figure 3
```
Title: "Analyze Figure 3?"
Message: "I can explain: 'System architecture diagram showing the interaction between...'"
```

### Example 2: Hovering over Table 1
```
Title: "Analyze Table 1?"
Message: "I can explain: 'Performance comparison across different datasets...'"
```

### Example 3: Hovering over unlabeled diagram
```
Title: "Analyze Diagram?"
Message: "I can help you understand this visual element."
```

---

## 🔧 Implementation Priority

1. **High Priority:**
   - Create `ImageDetector` class
   - Implement caption detection
   - Update popup to use real data

2. **Medium Priority:**
   - Extract actual image data
   - Integrate with eye tracking
   - Send real data to AI

3. **Nice to Have:**
   - Classify image types accurately
   - Extract equations/formulas
   - Cache detected images

---

## 📝 Notes

- The current popup is completely hardcoded
- Need to detect actual images/figures in the PDF
- Apryse has APIs for image extraction
- Captions can be found by text pattern matching
- Should work for figures, tables, charts, diagrams, equations

---

## 🎉 Summary

The "Analyze Diagram?" popup currently shows fake data ("Fig 1", "architecture flow"). 

**Solution:** Create an `ImageDetector` that:
1. Detects when user hovers/gazes at an image
2. Extracts the real figure number and caption
3. Shows popup with actual information
4. Sends real image data to AI for specific analysis

This will make the feature genuinely helpful instead of misleading!
