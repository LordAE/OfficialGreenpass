import React, { useState, useEffect } from 'react';
import { TutoringSession } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle, Calendar, Star } from 'lucide-react';
import { format } from 'date-fns';

export default function TutorStudents() { 
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await User.me();
        
        // Get sessions for this tutor
        const sessionData = await TutoringSession.filter({ 
          tutor_id: currentUser.id 
        }, '-created_date');
        setSessions(sessionData);
        
        // Get unique students
        const studentIds = [...new Set(sessionData.map(s => s.student_id))];
        if (studentIds.length > 0) {
          const studentData = await User.filter({ id: { $in: studentIds } });
          
          // Add session statistics to each student
          const studentsWithStats = studentData.map(student => {
            const studentSessions = sessionData.filter(s => s.student_id === student.id);
            return {
              ...student,
              totalSessions: studentSessions.length,
              completedSessions: studentSessions.filter(s => s.status === 'completed').length,
              averageRating: studentSessions.filter(s => s.student_rating).length > 0 ? 
                studentSessions.reduce((sum, s) => sum + (s.student_rating || 0), 0) / studentSessions.filter(s => s.student_rating).length : 0,
              lastSession: studentSessions.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0],
              subjects: [...new Set(studentSessions.map(s => s.subject))]
            };
          });
          
          setStudents(studentsWithStats);
        }
      } catch (error) {
        console.error("Error loading students:", error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Users className="w-8 h-8 text-purple-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            My Students
          </h1>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Student Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Total Sessions</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Last Session</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.full_name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {student.subjects.map(subject => (
                            <Badge key={subject} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{student.totalSessions}</TableCell>
                      <TableCell>{student.completedSessions}</TableCell>
                      <TableCell>
                        {student.averageRating > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span>{student.averageRating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No ratings</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.lastSession ? 
                          format(new Date(student.lastSession.scheduled_date), 'MMM dd, yyyy') : 
                          'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Calendar className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Students Yet</h3>
                <p className="text-gray-600">Students who book sessions with you will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}