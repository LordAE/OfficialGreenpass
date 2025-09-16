import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TutoringSession } from '@/api/entities';
import { User } from '@/api/entities';
import { Tutor } from '@/api/entities';
import { Calendar, Clock, Video, Star, BookOpen, User as UserIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SessionCard = ({ session, tutorData, onJoin, onRate }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canJoinSession = () => {
    if (session.status !== 'scheduled') return false;
    const sessionTime = new Date(session.scheduled_date);
    const now = new Date();
    const timeDiff = sessionTime.getTime() - now.getTime();
    // Allow joining 15 minutes before session starts
    return timeDiff <= 15 * 60 * 1000 && timeDiff >= -30 * 60 * 1000;
  };

  const canRateSession = () => {
    return session.status === 'completed' && !session.student_rating;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{session.subject}</h3>
            <p className="text-gray-600">with {tutorData?.full_name || 'Tutor'}</p>
          </div>
          <Badge className={getStatusColor(session.status)}>
            {session.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          {/* Fixed: Display session date and time */}
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(session.scheduled_date), 'EEEE, MMMM do, yyyy')}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{format(new Date(session.scheduled_date), 'h:mm a')} ({session.duration} minutes)</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <BookOpen className="w-4 h-4" />
            <span>{session.session_type === 'individual' ? 'One-on-One' : 'Group Session'}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <UserIcon className="w-4 h-4" />
            <span>Price: ${session.price}</span>
          </div>
        </div>

        {session.session_notes && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">Session Notes:</h4>
            <p className="text-sm text-gray-600">{session.session_notes}</p>
          </div>
        )}

        <div className="flex gap-2">
          {canJoinSession() && (
            <Button onClick={() => onJoin(session)} className="flex-1">
              <Video className="w-4 h-4 mr-2" />
              Join Session
            </Button>
          )}
          
          {canRateSession() && (
            <Button variant="outline" onClick={() => onRate(session)} className="flex-1">
              <Star className="w-4 h-4 mr-2" />
              Rate Session
            </Button>
          )}
          
          {session.status === 'scheduled' && !canJoinSession() && (
            <Button variant="outline" disabled className="flex-1">
              Session Scheduled
            </Button>
          )}
        </div>

        {session.student_rating && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Your rating:</span>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < session.student_rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{session.student_rating}/5</span>
            </div>
            {session.student_feedback && (
              <p className="text-sm text-gray-600 mt-1">{session.student_feedback}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function MySessions() {
  const [sessions, setSessions] = useState([]);
  const [tutors, setTutors] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        // Load user's sessions
        const userSessions = await TutoringSession.filter(
          { student_id: currentUser.id },
          '-scheduled_date'
        );
        setSessions(userSessions);

        // Load tutor data for sessions
        const tutorIds = [...new Set(userSessions.map(s => s.tutor_id))];
        const tutorDataArray = await Promise.all(
          tutorIds.map(async (tutorId) => {
            try {
              // Get the user data for the tutor
              const tutorUsers = await User.filter({ id: tutorId });
              return tutorUsers.length > 0 ? { id: tutorId, ...tutorUsers[0] } : null;
            } catch (error) {
              console.warn(`Failed to load tutor ${tutorId}:`, error);
              return null;
            }
          })
        );

        const tutorsMap = tutorDataArray.reduce((acc, tutor) => {
          if (tutor) acc[tutor.id] = tutor;
          return acc;
        }, {});
        setTutors(tutorsMap);
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleJoinSession = (session) => {
    if (session.meeting_link) {
      window.open(session.meeting_link, '_blank');
    } else {
      alert('Meeting link not available. Please contact your tutor.');
    }
  };

  const handleRateSession = (session) => {
    const rating = prompt('Rate this session (1-5 stars):');
    if (rating && rating >= 1 && rating <= 5) {
      const feedback = prompt('Leave feedback (optional):') || '';
      
      // Update session with rating
      TutoringSession.update(session.id, {
        student_rating: parseInt(rating),
        student_feedback: feedback
      }).then(() => {
        // Refresh sessions
        window.location.reload();
      }).catch(error => {
        console.error('Error rating session:', error);
        alert('Failed to submit rating. Please try again.');
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your sessions...</p>
        </div>
      </div>
    );
  }

  const upcomingSessions = sessions.filter(s => 
    s.status === 'scheduled' && new Date(s.scheduled_date) > new Date()
  );
  const pastSessions = sessions.filter(s => 
    s.status === 'completed' || (s.status === 'scheduled' && new Date(s.scheduled_date) <= new Date())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tutoring Sessions</h1>
            <p className="text-gray-600 mt-1">Manage and join your scheduled sessions</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Session Credits Available</p>
            <p className="text-2xl font-bold text-green-600">{user?.session_credits || 0}</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No sessions yet</h3>
              <p className="text-gray-600 mb-4">Book your first tutoring session to get started.</p>
              <Link to={createPageUrl('Tutors')}>
                <Button>Find a Tutor</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Sessions */}
            {upcomingSessions.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Upcoming Sessions</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingSessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      tutorData={tutors[session.tutor_id]}
                      onJoin={handleJoinSession}
                      onRate={handleRateSession}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Sessions */}
            {pastSessions.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Past Sessions</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {pastSessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      tutorData={tutors[session.tutor_id]}
                      onJoin={handleJoinSession}
                      onRate={handleRateSession}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}