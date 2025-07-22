import fs from 'fs'
import path from 'path'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  password: string // In production, this would be hashed
  institution?: string
  expertise: string[]
  createdAt: string
}

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json')

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(USERS_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load users from file
function loadUsers(): User[] {
  try {
    ensureDataDir()
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error loading users:', error)
  }
  
  // Return default users if file doesn't exist or can't be read
  return [
    {
      id: "1",
      firstName: "Sakil",
      lastName: "Sarker", 
      email: "demo@paperpal.com",
      password: "password123",
      institution: "Demo University",
      expertise: ["Computer Science"],
      createdAt: new Date().toISOString()
    }
  ]
}

// Save users to file
function saveUsers(users: User[]) {
  try {
    ensureDataDir()
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
  } catch (error) {
    console.error('Error saving users:', error)
  }
}

// Update user information
export function updateUser(userId: string, updates: Partial<User>): User | null {
  const users = loadUsers()
  const userIndex = users.findIndex(user => user.id === userId)
  
  if (userIndex === -1) {
    return null
  }
  
  users[userIndex] = { ...users[userIndex], ...updates }
  saveUsers(users)
  
  return users[userIndex]
}

// Get all users
export function getUsers(): User[] {
  return loadUsers()
}

// Find user by email
export function findUserByEmail(email: string): User | undefined {
  const users = loadUsers()
  return users.find(user => user.email === email)
}

// Add new user
export function addUser(userData: Omit<User, 'id' | 'createdAt'>): User {
  const users = loadUsers()
  
  const newUser: User = {
    ...userData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  }
  
  users.push(newUser)
  saveUsers(users)
  
  return newUser
}

// Check if user exists
export function userExists(email: string): boolean {
  return findUserByEmail(email) !== undefined
} 