'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { exportEventToWord } from '@/lib/wordExport'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Edit3,
  FileText,
  Download,
  User,
  Building,
  Map,
  Globe,
  Target,
  Sparkles,
  Star,
  Award,
  Coffee,
  Music,
  Gamepad2,
  BookOpen,
  Zap,
  Heart
} from 'lucide-react'

interface EventFormData {
  eventName: string
  eventType: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  location: string
  locationState: 'typing' | 'suggestions' | 'selected' | 'confirmed'
  selectedAddress: string
  inviteMode: 'group' | 'radius' | 'individuals'
  inviteData: any
}

const eventTypes = [
  { id: 'conference', label: 'Conference', icon: Building, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'workshop', label: 'Workshop', icon: BookOpen, color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'networking', label: 'Networking', icon: Users, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'social', label: 'Social Event', icon: Heart, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'meeting', label: 'Meeting', icon: Target, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'other', label: 'Other', icon: Sparkles, color: 'bg-gray-100 text-gray-700 border-gray-200' }
]

const locationSuggestions = [
  { address: '123 Main St, Downtown, City', distance: '0.2 mi' },
  { address: '456 Business Ave, Midtown, City', distance: '0.5 mi' },
  { address: '789 Convention Center, City Center, City', distance: '0.8 mi' },
  { address: '321 Tech Hub, Innovation District, City', distance: '1.2 mi' }
]

export default function CreateEventPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<EventFormData>({
    eventName: '',
    eventType: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    locationState: 'typing',
    selectedAddress: '',
    inviteMode: 'group',
    inviteData: {}
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!formData.eventName.trim()) {
          newErrors.eventName = 'Event name is required'
        }
        if (!formData.eventType) {
          newErrors.eventType = 'Event type is required'
        }
        break
      case 2:
        if (!formData.startDate) {
          newErrors.startDate = 'Start date is required'
        }
        if (!formData.startTime) {
          newErrors.startTime = 'Start time is required'
        }
        if (!formData.endDate) {
          newErrors.endDate = 'End date is required'
        }
        if (!formData.endTime) {
          newErrors.endTime = 'End time is required'
        }
        // Validate end date/time is after start
        if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
          const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
          const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
          if (endDateTime <= startDateTime) {
            newErrors.endTime = 'End time must be after start time'
          }
        }
        break
      case 3:
        if (!formData.location.trim()) {
          newErrors.location = 'Location is required'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleLocationInput = (value: string) => {
    setFormData(prev => ({
      ...prev,
      location: value,
      locationState: value.length > 2 ? 'suggestions' : 'typing'
    }))
  }

  const selectLocation = (address: string) => {
    setFormData(prev => ({
      ...prev,
      location: address,
      selectedAddress: address,
      locationState: 'selected'
    }))
  }

  const confirmLocation = () => {
    setFormData(prev => ({
      ...prev,
      locationState: 'confirmed'
    }))
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Create Your Event</h2>
        <p className="text-gray-600">Let's start with the basics</p>
      </div>

      {/* Event Name */}
      <div className="space-y-2">
        <Label htmlFor="eventName" className="text-sm font-medium text-gray-700">
          Event Name
        </Label>
        <Input
          id="eventName"
          value={formData.eventName}
          onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))}
          placeholder="Enter your event name"
          className="w-full"
        />
        {errors.eventName && (
          <p className="text-sm text-red-600">{errors.eventName}</p>
        )}
      </div>

      {/* Event Type - 6 Option Selector */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700">Event Type</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {eventTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setFormData(prev => ({ ...prev, eventType: type.id }))}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                formData.eventType === type.id
                  ? `${type.color} border-current`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <type.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{type.label}</span>
              </div>
            </button>
          ))}
        </div>
        {errors.eventType && (
          <p className="text-sm text-red-600">{errors.eventType}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
          Description (Optional)
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe your event..."
          rows={4}
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">When is your event?</h2>
        <p className="text-gray-600">Set the date and time</p>
      </div>

      {/* Start Date/Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
            Start Date
          </Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
          />
          {errors.startDate && (
            <p className="text-sm text-red-600">{errors.startDate}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime" className="text-sm font-medium text-gray-700">
            Start Time
          </Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
          />
          {errors.startTime && (
            <p className="text-sm text-red-600">{errors.startTime}</p>
          )}
        </div>
      </div>

      {/* End Date/Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
            End Date
          </Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
          />
          {errors.endDate && (
            <p className="text-sm text-red-600">{errors.endDate}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime" className="text-sm font-medium text-gray-700">
            End Time
          </Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
          />
          {errors.endTime && (
            <p className="text-sm text-red-600">{errors.endTime}</p>
          )}
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Where is your event?</h2>
        <p className="text-gray-600">Set the location</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium text-gray-700">
            Location
          </Label>
          <div className="relative">
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleLocationInput(e.target.value)}
              placeholder="Enter location or address"
              className="w-full"
            />
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          {errors.location && (
            <p className="text-sm text-red-600">{errors.location}</p>
          )}
        </div>

        {/* Location States */}
        {formData.locationState === 'suggestions' && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-3">Suggested Locations</h4>
            <div className="space-y-2">
              {locationSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectLocation(suggestion.address)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{suggestion.address}</span>
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.distance}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {formData.locationState === 'selected' && (
          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">{formData.selectedAddress}</span>
              </div>
              <Button
                onClick={confirmLocation}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Confirm
              </Button>
            </div>
          </div>
        )}

        {formData.locationState === 'confirmed' && (
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">{formData.selectedAddress}</span>
              <Badge variant="default" className="bg-blue-600">
                Confirmed
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Review & Create</h2>
        <p className="text-gray-600">Review your event details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Event Details</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(1)}
              className="flex items-center space-x-1"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Event Name</Label>
            <p className="text-gray-900">{formData.eventName}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Event Type</Label>
            <Badge variant="secondary">
              {eventTypes.find(t => t.id === formData.eventType)?.label}
            </Badge>
          </div>
          {formData.description && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Description</Label>
              <p className="text-gray-900">{formData.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Start</Label>
              <p className="text-gray-900">{formData.startDate} at {formData.startTime}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">End</Label>
              <p className="text-gray-900">{formData.endDate} at {formData.endTime}</p>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Location</Label>
            <p className="text-gray-900">{formData.selectedAddress}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center space-x-4">
        <Button
          onClick={async () => {
            try {
              await exportEventToWord(formData, `${formData.eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_event_spec.docx`)
            } catch (error) {
              console.error('Export failed:', error)
              alert('Export failed. Please try again.')
            }
          }}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <FileText className="h-4 w-4" />
          <span>Export to Word</span>
        </Button>
        <Button
          onClick={() => {/* Handle create event */}}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
        >
          <Sparkles className="h-4 w-4" />
          <span>Create Event</span>
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step < currentStep ? <Check className="h-4 w-4" /> : step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Basic Info</span>
              <span>Date & Time</span>
              <span>Location</span>
              <span>Review</span>
            </div>
          </div>

          <Card>
            <CardContent className="p-8">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
            </CardContent>
          </Card>

          {/* Navigation */}
          {currentStep < 4 && (
            <div className="flex justify-between mt-6">
              <Button
                onClick={prevStep}
                variant="outline"
                disabled={currentStep === 1}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>
              <Button
                onClick={nextStep}
                disabled={!formData.eventName.trim() && currentStep === 1}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
