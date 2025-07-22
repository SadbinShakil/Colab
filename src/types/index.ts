import { User, Paper, Annotation, Comment, Reaction, QuickNote, ChatMessage, StuckHelp, AISummary } from '@prisma/client'

// Re-export Prisma types
export type {
  User,
  Paper,
  Annotation,
  Comment,
  Reaction,
  QuickNote,
  ChatMessage,
  StuckHelp,
  AISummary
} from '@prisma/client'

// Define local types
export type AnnotationType = 'highlight' | 'comment' | 'stuck'
export type UserRole = 'admin' | 'user' | 'moderator'

// Extended types with relations
export type UserWithRelations = User & {
  papers: Paper[]
  annotations: Annotation[]
  _count?: {
    papers: number
    annotations: number
    comments: number
  }
}

export type PaperWithRelations = Paper & {
  uploader: User
  annotations: AnnotationWithRelations[]
  quickNotes: QuickNoteWithUser[]
  chatMessages: ChatMessageWithUser[]
  stuckHelps: StuckHelpWithUser[]
  summaries: AISummary[]
  _count?: {
    annotations: number
    quickNotes: number
    chatMessages: number
    stuckHelps: number
  }
}

export type AnnotationWithRelations = Annotation & {
  user: User
  comments: CommentWithUser[]
  _count?: {
    comments: number
  }
}

export type CommentWithUser = Comment & {
  user: User
  replies: CommentWithUser[]
  parent?: CommentWithUser
}

export type QuickNoteWithUser = QuickNote & {
  user: User
}

export type ChatMessageWithUser = ChatMessage & {
  user: User
}

export type StuckHelpWithUser = StuckHelp & {
  user: User
}

// UI Component Types
export interface AnnotationPosition {
  x: number
  y: number
  width: number
  height: number
  pageNumber: number
  boundingRect: DOMRect
  textContent: string
  textOffset: {
    start: number
    end: number
  }
}

export interface PDFViewerProps {
  file: string | File
  onTextSelection?: (selection: TextSelection) => void
  annotations?: AnnotationWithRelations[]
  onAnnotationClick?: (annotation: AnnotationWithRelations) => void
  scale?: number
  page?: number
}

export interface TextSelection {
  text: string
  position: AnnotationPosition
  pageNumber: number
}

export interface AnnotationFormData {
  text: string
  comment: string
  color: string
  type: AnnotationType
}

// Real-time Socket Events
export interface SocketEvents {
  // Join/Leave paper room
  'join-paper': (paperId: string) => void
  'leave-paper': (paperId: string) => void
  
  // Annotations
  'annotation-created': (annotation: AnnotationWithRelations) => void
  'annotation-updated': (annotation: AnnotationWithRelations) => void
  'annotation-deleted': (annotationId: string) => void
  
  // Comments
  'comment-created': (comment: CommentWithUser) => void
  'comment-updated': (comment: CommentWithUser) => void
  'comment-deleted': (commentId: string) => void
  
  // Chat messages
  'chat-message': (message: ChatMessageWithUser) => void
  
  // Stuck help
  'stuck-help-created': (stuckHelp: StuckHelpWithUser) => void
  'stuck-help-resolved': (stuckHelpId: string) => void
  
  // User presence
  'user-joined': (user: Pick<User, 'id' | 'name' | 'avatar'>) => void
  'user-left': (userId: string) => void
  'users-in-room': (users: Pick<User, 'id' | 'name' | 'avatar'>[]) => void
  
  // AI Summary updates
  'ai-summary-updated': (summary: AISummary) => void
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: UserRole
  expertise: string[]
}

export interface PaperUploadForm {
  title: string
  description?: string
  tags: string[]
  file: File
}

export interface StuckHelpForm {
  section: string
  description: string
  isAnonymous: boolean
}

// Context Types
export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: SignupForm) => Promise<void>
  logout: () => Promise<void>
}

export interface PaperContextType {
  currentPaper: PaperWithRelations | null
  annotations: AnnotationWithRelations[]
  quickNotes: QuickNoteWithUser[]
  chatMessages: ChatMessageWithUser[]
  stuckHelps: StuckHelpWithUser[]
  aiSummaries: AISummary[]
  loading: boolean
  error: string | null
  
  // Actions
  createAnnotation: (data: AnnotationFormData & { position: AnnotationPosition }) => Promise<void>
  updateAnnotation: (id: string, data: Partial<AnnotationFormData>) => Promise<void>
  deleteAnnotation: (id: string) => Promise<void>
  
  createComment: (annotationId: string, content: string, parentId?: string) => Promise<void>
  createQuickNote: (section: string, content: string, page: number) => Promise<void>
  sendChatMessage: (content: string) => Promise<void>
  createStuckHelp: (data: StuckHelpForm & { page: number; position: AnnotationPosition }) => Promise<void>
}

// Utility Types
export type Theme = 'light' | 'dark' | 'system'

export interface UserPreferences {
  theme: Theme
  pdfScale: number
  showAnnotations: boolean
  showQuickNotes: boolean
  autoSaveNotes: boolean
  notificationSettings: {
    newAnnotations: boolean
    newComments: boolean
    stuckHelp: boolean
    aiSummaries: boolean
  }
}

// AI Integration Types
export interface AIConfig {
  model: string
  temperature: number
  maxTokens: number
}

export interface AIPromptContext {
  paperTitle: string
  currentSection: string
  userQuery: string
  relatedAnnotations: AnnotationWithRelations[]
  discussionHistory: ChatMessageWithUser[]
}

export interface AIResponse {
  content: string
  confidence: number
  sources?: string[]
  suggestedActions?: string[]
}

// Learning Analytics Types
export interface UserActivity {
  userId: string
  paperId: string
  action: 'view' | 'annotate' | 'comment' | 'note' | 'stuck' | 'chat'
  timestamp: Date
  metadata?: Record<string, any>
}

export interface EngagementMetrics {
  readingTime: number
  scrollDepth: number
  annotationsCreated: number
  commentsPosted: number
  stuckHelpRequests: number
  notesCreated: number
  chatMessages: number
} 