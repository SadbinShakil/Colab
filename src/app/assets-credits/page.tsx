'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  Github, 
  ExternalLink, 
  Palette, 
  Code, 
  Database,
  Zap,
  Globe,
  FileText,
  Image,
  Music,
  Video,
  Download,
  Star,
  Award,
  Shield,
  CheckCircle,
  Users,
  Building,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'

interface Asset {
  name: string
  type: 'icon' | 'image' | 'font' | 'library' | 'api' | 'component'
  source: string
  license: string
  description: string
  url?: string
}

interface Credit {
  name: string
  role: string
  contribution: string
  contact?: string
}

const assets: Asset[] = [
  {
    name: 'Lucide React Icons',
    type: 'icon',
    source: 'Lucide',
    license: 'ISC',
    description: 'Beautiful & consistent icon toolkit made by the community',
    url: 'https://lucide.dev/'
  },
  {
    name: 'Tailwind CSS',
    type: 'library',
    source: 'Tailwind Labs',
    license: 'MIT',
    description: 'A utility-first CSS framework for rapid UI development',
    url: 'https://tailwindcss.com/'
  },
  {
    name: 'Next.js',
    type: 'library',
    source: 'Vercel',
    license: 'MIT',
    description: 'The React framework for production',
    url: 'https://nextjs.org/'
  },
  {
    name: 'React',
    type: 'library',
    source: 'Meta',
    license: 'MIT',
    description: 'A JavaScript library for building user interfaces',
    url: 'https://react.dev/'
  },
  {
    name: 'TypeScript',
    type: 'library',
    source: 'Microsoft',
    license: 'Apache-2.0',
    description: 'JavaScript with syntax for types',
    url: 'https://www.typescriptlang.org/'
  },
  {
    name: 'Prisma',
    type: 'library',
    source: 'Prisma',
    license: 'Apache-2.0',
    description: 'Next-generation ORM for Node.js and TypeScript',
    url: 'https://www.prisma.io/'
  },
  {
    name: 'Sonner',
    type: 'component',
    source: 'Sonner',
    license: 'MIT',
    description: 'Toast notifications for React',
    url: 'https://sonner.emilkowal.ski/'
  },
  {
    name: 'React Dropzone',
    type: 'component',
    source: 'React Dropzone',
    license: 'MIT',
    description: 'Simple HTML5 drag-drop zone with React.js',
    url: 'https://react-dropzone.js.org/'
  },
  {
    name: 'Apryse WebViewer',
    type: 'library',
    source: 'Apryse',
    license: 'Commercial',
    description: 'PDF viewing and annotation library',
    url: 'https://www.apryse.com/products/webviewer'
  },
  {
    name: 'Firebase',
    type: 'api',
    source: 'Google',
    license: 'Apache-2.0',
    description: 'App development platform',
    url: 'https://firebase.google.com/'
  },
  {
    name: 'OpenAI API',
    type: 'api',
    source: 'OpenAI',
    license: 'Commercial',
    description: 'AI language models for various tasks',
    url: 'https://openai.com/api/'
  }
]

const credits: Credit[] = [
  {
    name: 'Development Team',
    role: 'Lead Developers',
    contribution: 'Core application architecture, PDF processing, AI integration, and user interface design',
    contact: 'dev@company.com'
  },
  {
    name: 'Design Team',
    role: 'UI/UX Designers',
    contribution: 'User experience design, visual design system, and accessibility implementation',
    contact: 'design@company.com'
  },
  {
    name: 'AI Research Team',
    role: 'AI Specialists',
    contribution: 'Mathematical explanation algorithms, content analysis, and contextual AI features',
    contact: 'ai@company.com'
  },
  {
    name: 'Open Source Community',
    role: 'Contributors',
    contribution: 'Various open source libraries and tools that power this application',
    contact: 'See individual library credits'
  }
]

const getTypeIcon = (type: Asset['type']) => {
  switch (type) {
    case 'icon': return Palette
    case 'image': return Image
    case 'font': return FileText
    case 'library': return Code
    case 'api': return Database
    case 'component': return Zap
    default: return Globe
  }
}

const getTypeColor = (type: Asset['type']) => {
  switch (type) {
    case 'icon': return 'bg-purple-100 text-purple-700'
    case 'image': return 'bg-pink-100 text-pink-700'
    case 'font': return 'bg-blue-100 text-blue-700'
    case 'library': return 'bg-green-100 text-green-700'
    case 'api': return 'bg-orange-100 text-orange-700'
    case 'component': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export default function AssetsCreditsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Assets & Credits</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Acknowledging the amazing open source community, libraries, and contributors 
              that made this application possible.
            </p>
          </div>

          {/* Open Source Love */}
          <Card className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-8 text-center">
              <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Built with Open Source Love</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                This application is built on the foundation of incredible open source projects 
                and the dedicated developers who maintain them. We're grateful for their contributions 
                to the developer community.
              </p>
            </CardContent>
          </Card>

          {/* Assets Section */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <Star className="h-6 w-6 text-yellow-500" />
              <h2 className="text-3xl font-bold text-gray-900">Third-Party Assets</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map((asset, index) => {
                const TypeIcon = getTypeIcon(asset.type)
                const typeColor = getTypeColor(asset.type)
                
                return (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <TypeIcon className="h-5 w-5 text-gray-600" />
                          <CardTitle className="text-lg">{asset.name}</CardTitle>
                        </div>
                        <Badge className={`${typeColor} border-0`}>
                          {asset.type}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        by {asset.source}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-600">
                        {asset.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {asset.license} License
                        </Badge>
                        {asset.url && (
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                          >
                            <span>Visit</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Credits Section */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <Users className="h-6 w-6 text-blue-500" />
              <h2 className="text-3xl font-bold text-gray-900">Credits & Contributors</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {credits.map((credit, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      <span>{credit.name}</span>
                    </CardTitle>
                    <CardDescription>
                      {credit.role}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">
                      {credit.contribution}
                    </p>
                    {credit.contact && (
                      <div className="flex items-center space-x-2 text-sm text-blue-600">
                        <Mail className="h-4 w-4" />
                        <span>{credit.contact}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* License Information */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span>License Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Application License</h4>
                  <p className="text-sm text-gray-600">
                    This application is proprietary software. All rights reserved.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Third-Party Licenses</h4>
                  <p className="text-sm text-gray-600">
                    All third-party assets are used in accordance with their respective licenses.
                    See individual asset listings for specific license details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-blue-600" />
                <span>Contact & Support</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">support@company.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Address</p>
                    <p className="text-sm text-gray-600">123 Tech Street, City, State</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-12 py-8 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">
                All assets used with proper attribution and licensing
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Built with ❤️ by the development team • Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
