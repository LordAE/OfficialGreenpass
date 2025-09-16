import React, { useState, useEffect } from 'react';
import { TutoringSession } from '@/api/entities';
import { User } from '@/api/entities';
import { Wallet } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Video, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const StatusBadge = ({ status }) => {
  const colors = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
  };
  return <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
};

export default function TutorSessions() { 
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState({});
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await User.me();
        
        // Get sessions for this tutor
        const sessionData = await TutoringSession.filter({ 
          tutor_id: currentUser.id 
        }, '-scheduled_date');
        setSessions(sessionData);
        
        // Get student data
        const studentIds = [...new Set(sessionData.map(s => s.student_id))];
        if (studentIds.length > 0) {
          const studentData = await User.filter({ id: { $in: studentIds } });
          const studentMap = studentData.reduce((acc, student) => {
            acc[student.id] = student;
            return acc;
          }, {});
          setStudents(studentMap);
        }

        // Get wallet data
        const walletData = await Wallet.filter({ user_id: currentUser.id });
        if (walletData.length > 0) {
          setWallet(walletData[0]);
        }
      } catch (error) {
        console.error("Error loading sessions:", error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleJoinSession = (session) => {
    if (session.meeting_link) {
      window.open(session.meeting_link, '_blank');
    }
  };

  const stats = {
    totalSessions: sessions.length,
    upcomingSessions: sessions.filter(s => s.status === 'scheduled' && new Date(s.scheduled_date) > new Date()).length,
    completedSessions: sessions.filter(s => s.status === 'completed').length,
    totalEarnings: wallet?.total_earned || 0
  };

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
          <Calendar className="w-8 h-8 text-purple-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            My Sessions
          </h1>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.totalSessions}</div>
                  <p className="text-gray-600">Total Sessions</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.upcomingSessions}</div>
                  <p className="text-gray-600">Upcoming</p>
                </div>
                <Clock className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.completedSessions}</div>
                  <p className="text-gray-600">Completed</p>
                </div>
                <Calendar className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">${stats.totalEarnings.toFixed(2)}</div>
                  <p className="text-gray-600">Total Earnings</p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Session Schedule</CardTitle>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map(session => {
                    const student = students[session.student_id];
                    
                    return (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{student?.full_name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{student?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{session.subject}</TableCell>
                        <TableCell>
                          <div>
                            <div>{format(new Date(session.scheduled_date), 'MMM dd, yyyy')}</div>
                            <div className="text-sm text-gray-500">{format(new Date(session.scheduled_date), 'hh:mm a')}</div>
                          </div>
                        </TableCell>
                        <TableCell>{session.duration} min</TableCell>
                        <TableCell className="font-medium">${session.price}</TableCell>
                        <TableCell><StatusBadge status={session.status} /></TableCell>
                        <TableCell>
                          {session.status === 'scheduled' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleJoinSession(session)}
                              disabled={!session.meeting_link}
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Join
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sessions Scheduled</h3>
                <p className="text-gray-600">Student bookings will appear here once you're verified and available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}