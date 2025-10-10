# 📡 API Documentation - PaperPal

## Overview
This document provides comprehensive API endpoint documentation for the PaperPal platform.

**Base URL**: `http://localhost:3000/api`
**Content-Type**: `application/json`

---

## 🤖 AI & Analysis Endpoints

### 1. AI Help
**Endpoint**: `POST /api/ai-help`

**Purpose**: General AI assistance for document-related questions

**Request Body**:
```typescript
{
  question: string;           // User's question
  documentContent?: string;   // Optional document context
  documentTitle?: string;     // Optional document title
  documentAuthors?: string;   // Optional authors
  userId?: string;           // Optional user ID for tracking
  userName?: string;         // Optional user name
}
```

**Response**:
```typescript
{
  success: boolean;
  response: {
    answer: string;          // AI-generated answer
    confidence?: number;     // Optional confidence score
  }
}
```

**Example**:
```javascript
const response = await fetch('/api/ai-help', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "What is the main contribution of this paper?",
    documentContent: "...",
    documentTitle: "Attention Is All You Need"
  })
});
```

---

### 2. AI Summary
**Endpoint**: `POST /api/ai-summary`

**Purpose**: Generate comprehensive document summaries with metadata extraction

**Request Body**:
```typescript
{
  text: string;              // Document text content (required)
  persona?: 'novice' | 'practitioner' | 'reviewer';
  timeBudget?: '30s' | '2m' | 'deep';
  depth?: number;            // Analysis depth (1-5)
}
```

**Response**:
```typescript
{
  success: boolean;
  summary: {
    // Detection
    isResearchPaper: boolean;
    
    // Metadata (if research paper)
    title?: string;
    authors?: string;
    year?: string;
    journal?: string;
    abstract?: string;
    
    // Research sections
    motivation?: string;
    keyFindings?: string;
    methods?: string;
    results?: string;
    limitations?: string;
    futureWork?: string;
    applications?: string;
    
    // Non-research sections
    contentType?: string;
    summary?: string;
    keyPoints?: string;
    structure?: string;
    audience?: string;
    
    // Quality metrics
    confidence: number;       // 0-100
    
    // Performance data
    resultsMatrix?: Array<{
      metric: string;
      dataset: string;
      model: string;
      value: number;
      baseline?: string;
      baselineValue?: number;
    }>;
  }
}
```

**Example**:
```javascript
const summary = await fetch('/api/ai-summary', {
  method: 'POST',
  body: JSON.stringify({
    text: documentText,
    persona: 'reviewer',
    timeBudget: '2m',
    depth: 3
  })
});
```

---

### 3. Vision Analysis
**Endpoint**: `POST /api/vision-analysis`

**Purpose**: Analyze images and figures using GPT-4 Vision

**Request Body**:
```typescript
{
  imageData: string;         // Base64 encoded image or URL
  caption?: string;          // Optional figure caption
  question?: string;         // Specific question about image
  documentTitle?: string;
  documentAuthors?: string;
  documentContent?: string;  // For context
  isDetailedMode?: boolean;  // Detailed vs concise analysis
}
```

**Response**:
```typescript
{
  success: boolean;
  response: {
    answer: string | {       // JSON or text response
      description: string;
      objects: string[];
      text: string[];
      insights: string[];
      context: string;
      technical: string;
      recommendations: string[];
    }
  }
}
```

**Example**:
```javascript
const analysis = await fetch('/api/vision-analysis', {
  method: 'POST',
  body: JSON.stringify({
    imageData: 'data:image/png;base64,...',
    caption: 'Figure 1: Transformer Architecture',
    question: 'Explain the multi-head attention mechanism',
    isDetailedMode: true
  })
});
```

---

## 📝 Annotation Endpoints

### 4. Get Annotations
**Endpoint**: `GET /api/annotations?documentId={id}`

**Purpose**: Fetch all annotations for a document

**Query Parameters**:
- `documentId` (required): Document identifier

**Response**:
```typescript
{
  success: boolean;
  annotations: Array<{
    id: string;
    documentId: string;
    type: 'highlight' | 'comment' | 'note';
    content: string;
    position: {
      pageNumber: number;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      selection?: string;
    };
    color?: string;
    author: {
      id: string;
      name: string;
    };
    timestamp: string;
    replies?: Array<{
      id: string;
      authorId: string;
      authorName: string;
      content: string;
      timestamp: string;
    }>;
  }>;
}
```

---

### 5. Create Annotation
**Endpoint**: `POST /api/annotations`

**Purpose**: Create a new annotation or reply to existing one

**Request Body (New Annotation)**:
```typescript
{
  documentId: string;
  type: 'highlight' | 'comment' | 'note';
  content: string;
  position: {
    pageNumber: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    selection?: string;
  };
  color?: string;
  author: {
    id: string;
    name: string;
  };
}
```

**Request Body (Reply)**:
```typescript
{
  documentId: string;
  annotationId: string;
  reply: {
    authorId: string;
    authorName: string;
    content: string;
  };
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
}
```

---

### 6. Delete Annotation
**Endpoint**: `DELETE /api/annotations?documentId={id}&annotationId={id}`

**Purpose**: Delete an annotation

**Query Parameters**:
- `documentId` (required)
- `annotationId` (required)

**Response**:
```typescript
{
  success: boolean;
  message: string;
}
```

---

## 🗂️ Annotation Layers (XFDF-based)

### 7. Get Annotation Layers
**Endpoint**: `GET /api/annotations/layers?documentId={id}&userId={id}&includeGlobal={bool}`

**Purpose**: Fetch XFDF annotation layers

**Query Parameters**:
- `documentId` (required)
- `userId` (optional)
- `includeGlobal` (optional, default: true)

**Response**:
```typescript
{
  success: boolean;
  data: {
    userLayer?: {
      id: string;
      xfdf: string;    // XFDF XML content
      version: number;
    };
    globalLayer?: {
      id: string;
      xfdf: string;
      version: number;
    };
    mergedXfdf: string;  // Combined XFDF
  };
}
```

---

### 8. Save Annotation Layer
**Endpoint**: `POST /api/annotations/layers`

**Purpose**: Save or update XFDF annotation layer

**Request Body**:
```typescript
{
  documentId: string;
  xfdf: string;           // XFDF XML content
  userId?: string;        // Null for global layer
  isGlobal?: boolean;     // Default: false
  expectedVersion?: number; // For conflict detection
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    id: string;
    documentId: string;
    userId: string | null;
    version: number;
    isGlobal: boolean;
    createdAt: string;
    updatedAt: string;
  };
}
```

---

### 9. Delete Annotation Layer
**Endpoint**: `DELETE /api/annotations/layers/[layerId]`

**Purpose**: Delete a specific annotation layer

**Response**:
```typescript
{
  success: boolean;
  message: string;
}
```

---

### 10. Delete User Layers
**Endpoint**: `DELETE /api/annotations/layers/user?documentId={id}&userId={id}`

**Purpose**: Delete all layers for a user on a document

**Query Parameters**:
- `documentId` (required)
- `userId` (required)

**Response**:
```typescript
{
  success: boolean;
  message: string;
}
```

---

## 🔄 Real-Time Collaboration (WebSocket)

### 11. WebSocket Connection
**Endpoint**: `GET /api/socket`

**Purpose**: Establish WebSocket connection for real-time features

**Connection**:
```javascript
const ws = new WebSocket('ws://localhost:3000/api/socket');

ws.onopen = () => {
  // Join document room
  ws.send(JSON.stringify({
    type: 'join',
    documentId: 'doc-123',
    userId: 'user-456',
    userName: 'John Doe'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle incoming messages
};
```

**Message Types**:

#### User Activity
```typescript
// Send
{
  type: 'activity';
  documentId: string;
  userId: string;
  userName: string;
  action: 'viewing' | 'annotating' | 'idle';
}

// Receive
{
  type: 'userJoined' | 'userLeft' | 'userActivity';
  user: {
    id: string;
    name: string;
    lastActive: string;
  };
}
```

#### Highlights
```typescript
// Broadcast highlight
{
  type: 'highlight';
  documentId: string;
  userId: string;
  userName: string;
  highlight: {
    pageNumber: number;
    text: string;
    color: string;
    position: object;
  };
}

// Receive highlight
{
  type: 'newHighlight';
  highlight: { /* ... */ };
}
```

#### Chat Messages
```typescript
// Send message
{
  type: 'chat';
  documentId: string;
  userId: string;
  userName: string;
  message: string;
}

// Receive message
{
  type: 'chatMessage';
  message: {
    id: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: string;
  };
}
```

#### Annotation Sync
```typescript
// Sync annotations
{
  type: 'annotationSync';
  documentId: string;
  userId: string;
  xfdf: string;
  version: number;
}

// Receive sync
{
  type: 'annotationUpdate';
  xfdf: string;
  version: number;
}
```

---

## 📄 Document Endpoints

### 12. Upload Document
**Endpoint**: `POST /api/upload`

**Purpose**: Upload a PDF document

**Request**: Multipart form-data
```typescript
FormData {
  file: File;              // PDF file
  userId: string;
  title?: string;
  authors?: string[];
}
```

**Response**:
```typescript
{
  success: boolean;
  document: {
    id: string;
    title: string;
    pdfUrl: string;
    createdAt: string;
  };
}
```

---

### 13. Get Document
**Endpoint**: `GET /api/documents/[id]`

**Purpose**: Fetch document metadata

**Response**:
```typescript
{
  success: boolean;
  document: {
    id: string;
    title: string;
    authors: string[];
    pdfUrl: string;
    userId: string;
    createdAt: string;
    annotationCount: number;
  };
}
```

---

## 🔐 Authentication

### 14. Session Management
**Endpoint**: `GET /api/auth/session`

**Purpose**: Get current user session

**Response**:
```typescript
{
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}
```

---

## ⚡ Rate Limiting

**Current**: Not implemented
**Recommended**:
- 100 requests/minute for authenticated users
- 20 requests/minute for unauthenticated
- 10 requests/minute for AI endpoints

---

## 🚨 Error Responses

All endpoints return errors in this format:

```typescript
{
  success: false;
  error: string;           // Error message
  code?: string;           // Error code
  details?: object;        // Additional error details
}
```

**Common Error Codes**:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## 📊 Response Times

**Typical Response Times**:
- Annotations (CRUD): < 100ms
- Document metadata: < 200ms
- AI Help: 2-5 seconds
- AI Summary: 5-15 seconds
- Vision Analysis: 3-10 seconds
- WebSocket latency: < 50ms

---

## 🧪 Testing Examples

### cURL Examples

```bash
# Get annotations
curl "http://localhost:3000/api/annotations?documentId=doc-123"

# Create annotation
curl -X POST http://localhost:3000/api/annotations \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "doc-123",
    "type": "highlight",
    "content": "Important finding",
    "position": { "pageNumber": 1 },
    "author": { "id": "user-1", "name": "John" }
  }'

# AI Summary
curl -X POST http://localhost:3000/api/ai-summary \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Full document text here...",
    "persona": "reviewer"
  }'
```

### JavaScript Examples

```javascript
// AI Help
async function askAI(question, context) {
  const response = await fetch('/api/ai-help', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, documentContent: context })
  });
  return response.json();
}

// Vision Analysis
async function analyzeImage(imageBase64, caption) {
  const response = await fetch('/api/vision-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      imageData: imageBase64, 
      caption,
      isDetailedMode: true 
    })
  });
  return response.json();
}

// WebSocket
function connectCollaboration(documentId, userId, userName) {
  const ws = new WebSocket('ws://localhost:3000/api/socket');
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'join',
      documentId,
      userId,
      userName
    }));
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleMessage(data);
  };
  
  return ws;
}
```

---

## 📝 Notes

1. All timestamps are in ISO 8601 format
2. All IDs use CUID format
3. XFDF content follows PDF standard
4. WebSocket supports binary messages for efficiency
5. API versioning not yet implemented (v1 assumed)

---

**Last Updated**: October 10, 2025

