# Fix Plan: Accurate Section Location Detection

## Problem Identified
When AI offers help for struggling users, it shows **generic locations** like "Section Page 2" instead of **actual section names** like "Introduction" or "Methodology".

## Root Cause
The `PDFHeadingExtractor` utility exists but is **NOT integrated** into the struggle detection flow. All struggle events use:
```typescript
sectionId: `section-page-${pageNumber}`,  // ❌ WRONG
sectionName: `Section Page ${pageNumber}`,
```

## Solution: 3-Step Fix

### Step 1: Extract PDF Sections on Document Load
**File**: `ApryseWebViewer.tsx`
**Location**: Inside the `useEffect` that initializes WebViewer

```typescript
// After document loads, extract actual sections
const { PDFHeadingExtractor } = await import('@/lib/pdfHeadingExtractor')
const extractor = new PDFHeadingExtractor(documentViewer, annotationManager)
const sections = await extractor.extractCommonSections()

// Store in a ref for fast lookup
pdfSectionsRef.current = sections
console.log('📚 Extracted sections:', sections.map(s => s.heading.text))
```

### Step 2: Create Helper Function to Map Page → Section
**File**: `ApryseWebViewer.tsx`
**New function**:

```typescript
const getSectionForPage = useCallback((pageNumber: number): { id: string, name: string } => {
  if (!pdfSectionsRef.current || pdfSectionsRef.current.length === 0) {
    return {
      id: `section-page-${pageNumber}`,
      name: `Page ${pageNumber}`
    }
  }

  // Find the section that contains this page
  const section = pdfSectionsRef.current.find(s => 
    pageNumber >= s.startPage && pageNumber <= s.endPage
  )

  if (section) {
    return {
      id: section.heading.id,
      name: section.heading.text
    }
  }

  // Fallback
  return {
    id: `section-page-${pageNumber}`,
    name: `Page ${pageNumber}`
  }
}, [])
```

### Step 3: Update All Struggle Detection Calls
**File**: `ApryseWebViewer.tsx`
**Lines to fix**: 1278, 1365, 2099

**Before**:
```typescript
sectionId: `section-page-${pageNumber}`,
sectionName: `Section Page ${pageNumber}`,
```

**After**:
```typescript
const sectionInfo = getSectionForPage(pageNumber)
// ...
sectionId: sectionInfo.id,
sectionName: sectionInfo.name,
```

## Expected Result
- User struggles on Introduction (page 2)
- Notification shows: "You seem confused about **Introduction**" ✅
- Instead of: "You seem confused about **Section Page 2**" ❌

## Files to Modify
1. `src/components/ApryseWebViewer.tsx` (main changes)
2. Test with a real research paper PDF

## Testing Checklist
- [ ] Upload a PDF with clear sections (Abstract, Introduction, Methods, Results)
- [ ] Trigger struggle detection (highlight "confused" 2x on Introduction)
- [ ] Verify notification shows "Introduction" not "Page 2"
- [ ] Check console logs show extracted sections
