'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WordExporter, exportEventToWord } from '@/lib/wordExport'
import { 
  Edit3, 
  Check, 
  ArrowLeft, 
  Download,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Users,
  Building,
  User,
  Mail,
  Phone,
  Globe,
  Sparkles,
  Send,
  Share2
} from 'lucide-react'

interface EventData {
  eventName: string
  eventType: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  location: string
  inviteMode: 'group' | 'radius' | 'individuals'
  inviteData: any
}

// Mock data - in real app this would come from context or props
const mockEventData: EventData = {
  eventName: 'Tech Innovation Summit 2024',
  eventType: 'conference',
  description: 'A comprehensive summit bringing together industry leaders, innovators, and technology enthusiasts to explore the latest trends in AI, blockchain, and sustainable technology.',
  startDate: '2024-03-15',
  startTime: '09:00',
  endDate: '2024-03-15',
  endTime: '17:00',
  location: '123 Convention Center, Downtown, City',
  inviteMode: 'group',
  inviteData: {
    selectedGroups: ['tech-team', 'marketing', 'design'],
    groupMembers: 26
  }
}

const eventTypes = [
  { id: 'conference', label: 'Conference', icon: Building, color: 'bg-blue-100 text-blue-700' },
  { id: 'workshop', label: 'Workshop', icon: FileText, color: 'bg-green-100 text-green-700' },
  { id: 'networking', label: 'Networking', icon: Users, color: 'bg-purple-100 text-purple-700' },
  { id: 'social', label: 'Social Event', icon: Globe, color: 'bg-pink-100 text-pink-700' },
  { id: 'meeting', label: 'Meeting', icon: Calendar, color: 'bg-orange-100 text-orange-700' },
  { id: 'other', label: 'Other', icon: Sparkles, color: 'bg-gray-100 text-gray-700' }
]

export default function ReviewPage() {
  const router = useRouter()
  const [eventData] = useState<EventData>(mockEventData)
  const [isExporting, setIsExporting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleEdit = (section: string) => {
    // In a real app, this would navigate to the specific step
    switch (section) {
      case 'basic':
        router.push('/create-event?step=1')
        break
      case 'datetime':
        router.push('/create-event?step=2')
        break
      case 'location':
        router.push('/create-event?step=3')
        break
      case 'invite':
        router.push('/create-event/invite')
        break
    }
  }

  const handleExportWord = async () => {
    setIsExporting(true)
    try {
      await exportEventToWord(eventData, `${eventData.eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_event_spec.docx`)
      // Success message could be shown via toast
      console.log('Event specification exported successfully!')
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCreateEvent = async () => {
    setIsCreating(true)
    // Simulate event creation
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsCreating(false)
    // In real app, this would create the actual event
    alert('Event created successfully!')
    router.push('/dashboard')
  }

  const getEventTypeInfo = () => {
    return eventTypes.find(t => t.id === eventData.eventType) || eventTypes[5]
  }

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`)
    return {
      date: dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: dateObj.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
  }

  const startDateTime = formatDateTime(eventData.startDate, eventData.startTime)
  const endDateTime = formatDateTime(eventData.endDate, eventData.endTime)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Your Event</h1>
            <p className="text-gray-600">Review all details before creating your event</p>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Basic Information</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit('basic')}
                    className="flex items-center space-x-1"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Event Name</label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{eventData.eventName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Event Type</label>
                  <div className="mt-1">
                    <Badge className={`${getEventTypeInfo().color} border-0`}>
                      {React.createElement(getEventTypeInfo().icon, { className: "h-3 w-3 mr-1" })}
                      {getEventTypeInfo().label}
                    </Badge>
                  </div>
                </div>
                {eventData.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="text-gray-900 mt-1">{eventData.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <span>Date & Time</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit('datetime')}
                    className="flex items-center space-x-1"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Start</label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{startDateTime.date}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{startDateTime.time}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">End</label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{endDateTime.date}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{endDateTime.time}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-purple-600" />
                    <span>Location</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit('location')}
                    className="flex items-center space-x-1"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{eventData.location}</span>
                </div>
              </CardContent>
            </Card>

            {/* Invitations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-orange-600" />
                    <span>Invitations</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit('invite')}
                    className="flex items-center space-x-1"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventData.inviteMode === 'group' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Invitation Mode:</span>
                      <Badge variant="secondary">Groups</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Selected Groups:</span>
                      <Badge variant="default" className="bg-blue-600">
                        {eventData.inviteData.selectedGroups.length} groups
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Total Members:</span>
                      <Badge variant="default" className="bg-green-600">
                        {eventData.inviteData.groupMembers} people
                      </Badge>
                    </div>
                  </div>
                )}
                {eventData.inviteMode === 'radius' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Invitation Mode:</span>
                      <Badge variant="secondary">Radius</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Radius:</span>
                      <Badge variant="default" className="bg-purple-600">
                        10 miles
                      </Badge>
                    </div>
                  </div>
                )}
                {eventData.inviteMode === 'individuals' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Invitation Mode:</span>
                      <Badge variant="secondary">Individuals</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Selected Contacts:</span>
                      <Badge variant="default" className="bg-orange-600">
                        6 people
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-8">
            <Button
              onClick={handleExportWord}
              disabled={isExporting}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? 'Exporting...' : 'Export to Word'}</span>
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={isCreating}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
              <span>{isCreating ? 'Creating...' : 'Create Event'}</span>
            </Button>
          </div>

          {/* Back Button */}
          <div className="flex justify-start mt-6">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
