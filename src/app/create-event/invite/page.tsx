'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  MapPin, 
  User,
  ArrowRight, 
  ArrowLeft,
  Check,
  Search,
  Globe,
  Building,
  Mail,
  Phone,
  Calendar,
  Clock,
  Target,
  UserPlus,
  Map,
  Filter
} from 'lucide-react'

interface InviteData {
  mode: 'group' | 'radius' | 'individuals'
  groupData: {
    selectedGroups: string[]
    groupMembers: number
  }
  radiusData: {
    radius: number
    unit: 'miles' | 'km'
    centerAddress: string
  }
  individualData: {
    contacts: Array<{
      name: string
      email: string
      status: 'pending' | 'invited' | 'accepted' | 'declined'
    }>
  }
}

const sampleGroups = [
  { id: 'tech-team', name: 'Tech Team', members: 12, color: 'bg-blue-100 text-blue-700' },
  { id: 'marketing', name: 'Marketing Team', members: 8, color: 'bg-green-100 text-green-700' },
  { id: 'sales', name: 'Sales Team', members: 15, color: 'bg-purple-100 text-purple-700' },
  { id: 'design', name: 'Design Team', members: 6, color: 'bg-pink-100 text-pink-700' },
  { id: 'hr', name: 'HR Team', members: 4, color: 'bg-orange-100 text-orange-700' },
  { id: 'finance', name: 'Finance Team', members: 5, color: 'bg-yellow-100 text-yellow-700' }
]

const sampleContacts = [
  { name: 'John Smith', email: 'john.smith@company.com', status: 'pending' as const },
  { name: 'Sarah Johnson', email: 'sarah.johnson@company.com', status: 'pending' as const },
  { name: 'Mike Chen', email: 'mike.chen@company.com', status: 'pending' as const },
  { name: 'Emily Davis', email: 'emily.davis@company.com', status: 'pending' as const },
  { name: 'David Wilson', email: 'david.wilson@company.com', status: 'pending' as const },
  { name: 'Lisa Brown', email: 'lisa.brown@company.com', status: 'pending' as const }
]

export default function InvitePage() {
  const router = useRouter()
  const [inviteData, setInviteData] = useState<InviteData>({
    mode: 'group',
    groupData: {
      selectedGroups: [],
      groupMembers: 0
    },
    radiusData: {
      radius: 10,
      unit: 'miles',
      centerAddress: '123 Main St, Downtown, City'
    },
    individualData: {
      contacts: sampleContacts
    }
  })

  const [searchQuery, setSearchQuery] = useState('')

  const handleGroupToggle = (groupId: string) => {
    const isSelected = inviteData.groupData.selectedGroups.includes(groupId)
    const group = sampleGroups.find(g => g.id === groupId)
    
    setInviteData(prev => ({
      ...prev,
      groupData: {
        selectedGroups: isSelected
          ? prev.groupData.selectedGroups.filter(id => id !== groupId)
          : [...prev.groupData.selectedGroups, groupId],
        groupMembers: isSelected
          ? prev.groupData.groupMembers - (group?.members || 0)
          : prev.groupData.groupMembers + (group?.members || 0)
      }
    }))
  }

  const handleContactToggle = (email: string) => {
    setInviteData(prev => ({
      ...prev,
      individualData: {
        ...prev.individualData,
        contacts: prev.individualData.contacts.map(contact =>
          contact.email === email
            ? { ...contact, status: contact.status === 'pending' ? 'invited' : 'pending' }
            : contact
        )
      }
    }))
  }

  const filteredContacts = inviteData.individualData.contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderGroupMode = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Invite Groups</h2>
        <p className="text-gray-600">Select teams or groups to invite</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sampleGroups.map((group) => {
          const isSelected = inviteData.groupData.selectedGroups.includes(group.id)
          return (
            <button
              key={group.id}
              onClick={() => handleGroupToggle(group.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? `${group.color} border-current`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5" />
                  <div>
                    <div className="font-medium">{group.name}</div>
                    <div className="text-sm text-gray-600">{group.members} members</div>
                  </div>
                </div>
                {isSelected && <Check className="h-5 w-5" />}
              </div>
            </button>
          )
        })}
      </div>

      {inviteData.groupData.selectedGroups.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {inviteData.groupData.selectedGroups.length} groups selected
                </span>
              </div>
              <Badge variant="default" className="bg-blue-600">
                {inviteData.groupData.groupMembers} total members
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderRadiusMode = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Radius Invitation</h2>
        <p className="text-gray-600">Invite people within a specific area</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="centerAddress" className="text-sm font-medium text-gray-700">
            Center Address
          </Label>
          <Input
            id="centerAddress"
            value={inviteData.radiusData.centerAddress}
            onChange={(e) => setInviteData(prev => ({
              ...prev,
              radiusData: { ...prev.radiusData, centerAddress: e.target.value }
            }))}
            placeholder="Enter center address"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="radius" className="text-sm font-medium text-gray-700">
              Radius
            </Label>
            <Input
              id="radius"
              type="number"
              value={inviteData.radiusData.radius}
              onChange={(e) => setInviteData(prev => ({
                ...prev,
                radiusData: { ...prev.radiusData, radius: parseInt(e.target.value) || 0 }
              }))}
              min="1"
              max="100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit" className="text-sm font-medium text-gray-700">
              Unit
            </Label>
            <select
              id="unit"
              value={inviteData.radiusData.unit}
              onChange={(e) => setInviteData(prev => ({
                ...prev,
                radiusData: { ...prev.radiusData, unit: e.target.value as 'miles' | 'km' }
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="miles">Miles</option>
              <option value="km">Kilometers</option>
            </select>
          </div>
        </div>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">
                Inviting people within {inviteData.radiusData.radius} {inviteData.radiusData.unit} of:
              </span>
            </div>
            <p className="text-sm text-green-700 mt-1">{inviteData.radiusData.centerAddress}</p>
            <div className="mt-2">
              <Badge variant="default" className="bg-green-600">
                ~{Math.floor(inviteData.radiusData.radius * 15)} potential contacts
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderIndividualMode = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Invite Individuals</h2>
        <p className="text-gray-600">Select specific people to invite</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="search" className="text-sm font-medium text-gray-700">
          Search Contacts
        </Label>
        <div className="relative">
          <Input
            id="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="space-y-3">
        {filteredContacts.map((contact) => (
          <div
            key={contact.email}
            className={`p-4 rounded-lg border-2 transition-all ${
              contact.status === 'invited'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleContactToggle(contact.email)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    contact.status === 'invited'
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {contact.status === 'invited' && <Check className="h-3 w-3 text-white" />}
                </button>
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-sm text-gray-600">{contact.email}</div>
                </div>
              </div>
              {contact.status === 'invited' && (
                <Badge variant="default" className="bg-blue-600">
                  Selected
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredContacts.filter(c => c.status === 'invited').length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {filteredContacts.filter(c => c.status === 'invited').length} contacts selected
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Mode Selector */}
          <div className="mb-8">
            <div className="flex justify-center space-x-4">
              {[
                { id: 'group', label: 'Groups', icon: Users, description: 'Invite teams' },
                { id: 'radius', label: 'Radius', icon: MapPin, description: 'Area-based' },
                { id: 'individuals', label: 'Individuals', icon: User, description: 'Specific people' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setInviteData(prev => ({ ...prev, mode: mode.id as any }))}
                  className={`p-4 rounded-lg border-2 transition-all text-center min-w-[120px] ${
                    inviteData.mode === mode.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <mode.icon className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-xs text-gray-600">{mode.description}</div>
                </button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-8">
              {inviteData.mode === 'group' && renderGroupMode()}
              {inviteData.mode === 'radius' && renderRadiusMode()}
              {inviteData.mode === 'individuals' && renderIndividualMode()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <Button
              onClick={() => router.push('/create-event/review')}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
