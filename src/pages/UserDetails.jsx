
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User } from '@/api/entities';
import { Agent } from '@/api/entities';
import { School } from '@/api/entities';
import { Tutor } from '@/api/entities';
import { TutoringSession } from '@/api/entities';
import { Case } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User as UserIcon, 
  Briefcase, 
  FileText, 
  BookOpen, 
  Save, 
  Building, 
  MapPin, 
  Globe, 
  DollarSign,
  Calendar,
  Star,
  Clock,
  CheckCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  Video,
  GraduationCap,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { format } from 'date-fns';

const SchoolDetails = ({ user, schoolData, enrolledStudents, studentsPage, setStudentsPage, totalStudents }) => (
  <Tabs defaultValue="info" className="space-y-6">
    <TabsList className="grid grid-cols-2 bg-red-100">
      <TabsTrigger value="info">School Info</TabsTrigger>
      <TabsTrigger value="students">Enrolled Students</TabsTrigger>
    </TabsList>

    <TabsContent value="info">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            School Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">School Name</label>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{schoolData?.name || 'N/A'}</p>
                {schoolData?.account_type === 'dummy' ? (
                  <Badge variant="secondary">Dummy</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800">Real</Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Founded Year</label>
              <p className="font-semibold">{schoolData?.founded_year || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Location</label>
              <p className="font-semibold flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {schoolData?.location}, {schoolData?.country}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Website</label>
              <p className="font-semibold flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {schoolData?.website ? (
                  <a href={schoolData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {schoolData.website}
                  </a>
                ) : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Annual Tuition (USD)</label>
              <p className="font-semibold text-green-600">${schoolData?.tuition_fees?.toLocaleString() || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Verification Status</label>
              <Badge className={schoolData?.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {schoolData?.verification_status || 'pending'}
              </Badge>
            </div>
          </div>
          
          {schoolData?.about && (
            <div>
              <label className="text-sm font-medium text-gray-600">About</label>
              <p className="text-gray-700 mt-1">{schoolData.about}</p>
            </div>
          )}

          {schoolData?.programs && schoolData.programs.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-600">Programs ({schoolData.programs.length})</label>
              <div className="grid gap-3 mt-2">
                {schoolData.programs.map((program, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{program.name}</p>
                        <p className="text-sm text-gray-600">{program.level} - {program.duration}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">${program.tuition_per_year?.toLocaleString()}/year</p>
                        <p className="text-sm text-gray-600">{program.available_seats} seats</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="students">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Enrolled Students
          </CardTitle>
          <CardDescription>
            Total Enrolled Students: {totalStudents}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enrolledStudents.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Program Enrolled</TableHead>
                    <TableHead>Enrollment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrolledStudents.map(student => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        {student.programId ? (
                          schoolData?.programs?.find(p => p.id === student.programId)?.name || 'Unknown Program'
                        ) : 'Not specified'}
                      </TableCell>
                      <TableCell>{format(new Date(student.created_date), 'MMM dd, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="flex items-center justify-between mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setStudentsPage(Math.max(1, studentsPage - 1))}
                  disabled={studentsPage <= 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <span className="text-sm text-gray-600">
                  Page {studentsPage} of {Math.ceil(totalStudents / 10)}
                </span>
                
                <Button 
                  variant="outline" 
                  onClick={() => setStudentsPage(studentsPage + 1)}
                  disabled={enrolledStudents.length < 10}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No enrolled students found for this school</p>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
);

const AgentDetails = ({ user, agentData }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Agent Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Company Name</label>
            <p className="font-semibold">{agentData?.company_name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Business License (MST)</label>
            <p className="font-semibold">{agentData?.business_license_mst || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Year Established</label>
            <p className="font-semibold">{agentData?.year_established || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Referral Code</label>
            <p className="font-semibold text-blue-600">{agentData?.referral_code || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Commission Rate</label>
            <p className="font-semibold text-green-600">{agentData?.commission_rate ? `${(agentData.commission_rate * 100).toFixed(1)}%` : 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Verification Status</label>
            <Badge className={agentData?.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {agentData?.verification_status || 'pending'}
            </Badge>
          </div>
        </div>

        {agentData?.contact_person && (
          <div>
            <label className="text-sm font-medium text-gray-600">Contact Person</label>
            <div className="bg-gray-50 p-3 rounded-lg mt-1">
              <p className="font-medium">{agentData.contact_person.name}</p>
              <p className="text-sm text-gray-600">{agentData.contact_person.title}</p>
              <p className="text-sm text-gray-600">{agentData.contact_person.email}</p>
              <p className="text-sm text-gray-600">{agentData.contact_person.phone}</p>
            </div>
          </div>
        )}

        {agentData?.services_offered && agentData.services_offered.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-600">Services Offered</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {agentData.services_offered.map((service, index) => (
                <Badge key={index} variant="outline">{service}</Badge>
              ))}
            </div>
          </div>
        )}

        {agentData?.target_countries && agentData.target_countries.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-600">Target Countries</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {agentData.target_countries.map((country, index) => (
                <Badge key={index} variant="outline">{country}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">${agentData?.total_earned || 0}</p>
            <p className="text-sm text-gray-600">Total Earned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">${agentData?.pending_payout || 0}</p>
            <p className="text-sm text-gray-600">Pending Payout</p>
          </div>
          <div className="text-center">
            <Badge className={agentData?.payout_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {agentData?.payout_status || 'none'}
            </Badge>
            <p className="text-sm text-gray-600 mt-1">Payout Status</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const TutorDetails = ({ user, tutorData, sessions }) => {
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled' && new Date(s.scheduled_date) > new Date());
  const totalEarnings = completedSessions.reduce((sum, s) => sum + (s.price || 0), 0);

  return (
    <Tabs defaultValue="info" className="space-y-6">
      <TabsList className="grid grid-cols-3 bg-purple-100">
        <TabsTrigger value="info">Tutor Info</TabsTrigger>
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
        <TabsTrigger value="earnings">Earnings</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Tutor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Experience</label>
                <p className="font-semibold">{tutorData?.experience_years || 0} years</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Hourly Rate</label>
                <p className="font-semibold text-green-600">${tutorData?.hourly_rate || 0}/hour</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Rating</label>
                <p className="font-semibold flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  {tutorData?.rating || 'No ratings yet'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Total Students</label>
                <p className="font-semibold">{tutorData?.total_students || 0}</p>
              </div>
            </div>

            {tutorData?.specializations && tutorData.specializations.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">Specializations</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tutorData.specializations.map((spec, index) => (
                    <Badge key={index} className="bg-purple-100 text-purple-800">{spec}</Badge>
                  ))}
                </div>
              </div>
            )}

            {tutorData?.qualifications && tutorData.qualifications.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">Qualifications</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tutorData.qualifications.map((qual, index) => (
                    <Badge key={index} variant="outline">{qual}</Badge>
                  ))}
                </div>
              </div>
            )}

            {tutorData?.languages && tutorData.languages.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">Languages</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tutorData.languages.map((lang, index) => (
                    <Badge key={index} variant="outline">{lang}</Badge>
                  ))}
                </div>
              </div>
            )}

            {tutorData?.bio && (
              <div>
                <label className="text-sm font-medium text-gray-600">Bio</label>
                <p className="text-gray-700 mt-1">{tutorData.bio}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-600">Verification Status</label>
              <Badge className={tutorData?.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {tutorData?.verification_status || 'pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sessions">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Tutoring Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.slice(0, 10).map(session => (
                    <TableRow key={session.id}>
                      <TableCell>Student {session.student_id.slice(-4)}</TableCell>
                      <TableCell>{session.subject}</TableCell>
                      <TableCell>
                        <div>
                          <div>{format(new Date(session.scheduled_date), 'MMM dd, yyyy')}</div>
                          <div className="text-sm text-gray-500">{format(new Date(session.scheduled_date), 'hh:mm a')}</div>
                        </div>
                      </TableCell>
                      <TableCell>{session.duration} min</TableCell>
                      <TableCell className="font-medium">${session.price}</TableCell>
                      <TableCell>
                        <Badge className={
                          session.status === 'completed' ? 'bg-green-100 text-green-800' :
                          session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {session.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No sessions found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="earnings">
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">${totalEarnings}</div>
                    <p className="text-gray-600 text-sm">Total Earned</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{sessions.length}</div>
                    <p className="text-gray-600 text-sm">Total Sessions</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{completedSessions.length}</div>
                    <p className="text-gray-600 text-sm">Completed</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{upcomingSessions.length}</div>
                    <p className="text-gray-600 text-sm">Upcoming</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Earning History</CardTitle>
            </CardHeader>
            <CardContent>
              {completedSessions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedSessions.map(session => (
                      <TableRow key={session.id}>
                        <TableCell>{format(new Date(session.scheduled_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{session.subject}</TableCell>
                        <TableCell>{session.duration} min</TableCell>
                        <TableCell className="font-semibold text-green-600">${session.price}</TableCell>
                        <TableCell>
                          {session.student_rating ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span>{session.student_rating}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No rating</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No earnings yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};

const StudentDetails = ({ user, allAgents, selectedAgentId, setSelectedAgentId, handleAgentReassignment, saving, sessions }) => {
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled' && new Date(s.scheduled_date) > new Date());
  const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled' || s.status === 'missed' || (s.status === 'scheduled' && new Date(s.scheduled_date) <= new Date()));

  return (
    <Tabs defaultValue="agent" className="space-y-6">
      <TabsList className="grid grid-cols-2 bg-blue-100">
        <TabsTrigger value="agent">Agent Management</TabsTrigger>
        <TabsTrigger value="sessions">Tutor Sessions</TabsTrigger>
      </TabsList>

      <TabsContent value="agent">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" /> Agent Management</CardTitle>
              <CardDescription>
                {selectedAgentId ? "Agent assigned" : "No agent assigned."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Re-assign Agent</label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a verified agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {allAgents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAgentReassignment} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Agent Assignment"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> School & Applications</CardTitle>
              <CardDescription>Visa and school application cases.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Application details will be shown here.</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="sessions">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length > 0 ? (
                <div className="space-y-4">
                  {upcomingSessions.map(session => (
                    <div key={session.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{session.subject}</p>
                          <p className="text-sm text-gray-600">Tutor: {session.tutor_id}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(session.scheduled_date), 'MMM dd, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(session.scheduled_date), 'hh:mm a')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-blue-100 text-blue-800 mb-2">Scheduled</Badge>
                          {session.meeting_link && (
                            <div>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
                                <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                                  <Video className="w-4 h-4 mr-1" />
                                  Join
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No upcoming sessions</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Past Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pastSessions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tutor</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastSessions.slice(0, 10).map(session => (
                      <TableRow key={session.id}>
                        <TableCell>{format(new Date(session.scheduled_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>Tutor {session.tutor_id.slice(-4)}</TableCell>
                        <TableCell>{session.subject}</TableCell>
                        <TableCell>
                          <Badge className={
                            session.status === 'completed' ? 'bg-green-100 text-green-800' :
                            session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            session.status === 'missed' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {session.student_rating ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span>{session.student_rating}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No rating</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No past sessions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default function UserDetails() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('id');

  const [user, setUser] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [agentData, setAgentData] = useState(null);
  const [tutorData, setTutorData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentsPage, setStudentsPage] = useState(1);
  const [allAgents, setAllAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const validObjectIdRegex = /^[a-f\d]{24}$/i;
    
    if (!userId) {
      setError("No user ID provided in the URL.");
      setLoading(false);
      return;
    }
    
    if (!validObjectIdRegex.test(userId)) {
      setError("Invalid user ID format.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null); // Clear any previous errors
      try {
        const userResult = await User.filter({ id: userId });
        if (!userResult || userResult.length === 0) {
            setError("User not found.");
            setLoading(false);
            return;
        }
        const userData = userResult[0];
        setUser(userData);

        // Load type-specific data based on user type
        if (userData.user_type === 'school') {
          const schoolResult = await School.filter({ user_id: userId });
          if (schoolResult.length > 0) {
            setSchoolData(schoolResult[0]);
            
            // Fetch enrolled students for this school
            const studentsResult = await User.filter({ 
              user_type: { $in: ['student', 'user'] }, 
              schoolId: schoolResult[0].id 
            }, '-created_date', 10, (studentsPage - 1) * 10);
            setEnrolledStudents(studentsResult);
            
            // Get total count of enrolled students
            const allStudentsResult = await User.filter({ 
              user_type: { $in: ['student', 'user'] }, 
              schoolId: schoolResult[0].id 
            });
            setTotalStudents(allStudentsResult.length);
          }
        } else if (userData.user_type === 'agent') {
          const agentResult = await Agent.filter({ user_id: userId });
          if (agentResult.length > 0) {
            setAgentData(agentResult[0]);
          }
        } else if (userData.user_type === 'tutor') {
          const tutorResult = await Tutor.filter({ user_id: userId });
          if (tutorResult.length > 0) {
            setTutorData(tutorResult[0]);
          }
          
          // Load tutor sessions
          const sessionData = await TutoringSession.filter({ tutor_id: userId }, '-scheduled_date');
          setSessions(sessionData);
        } else if (userData.user_type === 'student' || userData.user_type === 'user') {
          // Load student sessions
          const sessionData = await TutoringSession.filter({ student_id: userId }, '-scheduled_date');
          setSessions(sessionData);
          
          // Load agent data for reassignment
          const validObjectIdRegex = /^[a-fA-F0-9]{24}$/; // Local regex for agent IDs
          
          if (userData.referred_by_agent_id && validObjectIdRegex.test(userData.referred_by_agent_id)) {
            try {
              const currentAgentData = await Agent.filter({ id: userData.referred_by_agent_id });
              if (currentAgentData.length > 0) {
                setSelectedAgentId(currentAgentData[0].id);
              }
            } catch (agentError) {
              console.warn('Failed to fetch current agent:', agentError);
              // Optionally set a specific error for agent fetch failure if critical
            }
          }
          
          const allAgentsData = await Agent.filter({ verification_status: 'verified' });
          setAllAgents(allAgentsData);
        }

      } catch (error) {
        console.error("Failed to fetch user details:", error);
        setError("An error occurred while fetching user details. Please try again later.");
      }
      setLoading(false);
    };

    fetchData();
  }, [userId, studentsPage]);

  const handleAgentReassignment = async () => {
    if (!selectedAgentId || !user) return;
    
    setSaving(true);
    try {
        await User.update(user.id, { referred_by_agent_id: selectedAgentId });
        
        const openCases = await Case.filter({ student_id: user.id, status: { $ne: 'Approved' } });
        const caseUpdatePromises = openCases.map(c => Case.update(c.id, { agent_id: selectedAgentId }));
        await Promise.all(caseUpdatePromises);
        
    } catch(error) {
        console.error("Failed to reassign agent:", error);
        alert("Failed to reassign agent. Please try again."); // Simple alert for user feedback
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
       <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
    );
  }

  // This check is mainly for cases where loading finished, no explicit error was set,
  // but the user object somehow ended up null (e.g., if User.filter returned empty and
  // the explicit setError("User not found.") wasn't hit for some edge case)
  if (!user) {
    return <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="w-16 h-16 text-gray-400 mb-4" />
      <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
      <p className="text-gray-600">The requested user could not be loaded.</p>
    </div>;
  }

  const renderTypeSpecificContent = () => {
    switch (user.user_type) {
      case 'school':
        return <SchoolDetails 
          user={user} 
          schoolData={schoolData} 
          enrolledStudents={enrolledStudents}
          studentsPage={studentsPage}
          setStudentsPage={setStudentsPage}
          totalStudents={totalStudents}
        />;
      case 'agent':
        return <AgentDetails user={user} agentData={agentData} />;
      case 'tutor':
        return <TutorDetails user={user} tutorData={tutorData} sessions={sessions} />;
      case 'student':
      case 'user':
        return <StudentDetails 
          user={user}
          allAgents={allAgents}
          selectedAgentId={selectedAgentId}
          setSelectedAgentId={setSelectedAgentId}
          handleAgentReassignment={handleAgentReassignment}
          saving={saving}
          sessions={sessions}
        />;
      default:
        return (
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600">No specific display available for user type: <Badge className="capitalize">{user.user_type}</Badge></p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profile_picture} alt={user.full_name} />
              <AvatarFallback>{user.full_name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{user.full_name}</CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span>{user.email}</span>
                <Badge className="capitalize">{user.user_type}</Badge>
                <span>Joined {new Date(user.created_date).toLocaleDateString()}</span>
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        {renderTypeSpecificContent()}
      </div>
    </div>
  );
}
