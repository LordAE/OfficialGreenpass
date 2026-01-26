// src/pages/MyAgent.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Users, MessageCircle, FileText, Phone, Mail, Send, Loader2, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

// --- Firebase ---
import { db } from '@/firebase';
import {
  doc, getDoc, collection, getDocs, query, where, orderBy, limit, addDoc, serverTimestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useTr } from "@/i18n/useTr";

const ContactAgentModal = ({ agent, onSend, onCancel }) => {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSend({ subject: subject || 'Student Inquiry', message });
    setMessage('');
    setSubject('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Subject (Optional)</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What would you like to discuss?"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Message</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          rows={5}
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!message.trim()}>
          <Send className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </div>
    </form>
  );
};

const CaseProgressCard = ({ caseData }) => {
  const getProgress = () => {
    if (!caseData.checklist || caseData.checklist.length === 0) return 0;
    const completed = caseData.checklist.filter(item => item.status === 'verified').length;
    return (completed / caseData.checklist.length) * 100;
  };

  const getStatusColor = (status) => {
    const colors = {
      "Application Started": "bg-blue-100 text-blue-800",
      "Documents Pending": "bg-yellow-100 text-yellow-800",
      "Under Review": "bg-purple-100 text-purple-800",
      "Approved": "bg-green-100 text-green-800",
      "Rejected": "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const progress = getProgress();

  const createdAt =
    caseData.created_date?.toDate
      ? caseData.created_date.toDate()
      : caseData.created_date
      ? new Date(caseData.created_date)
      : null;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold">{caseData.case_type}</h4>
            {caseData.id && <p className="text-sm text-gray-600">Case #{String(caseData.id).slice(-6)}</p>}
            {createdAt && (
              <p className="text-xs text-gray-500 mt-1">Created {format(createdAt, 'PP')}</p>
            )}
          </div>
          <Badge className={getStatusColor(caseData.status)}>
            {caseData.status}
          </Badge>
        </div>
        
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {Array.isArray(caseData.timeline) && caseData.timeline.length > 0 && (
          <div className="text-sm text-gray-600">
            <strong>Latest Update:</strong> {caseData.timeline[caseData.timeline.length - 1].event}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function MyAgent() {
  const { tr } = useTr("myAgent");

  const [currentUser, setCurrentUser] = useState(null);
  const [agent, setAgent] = useState(null);           // from 'agents' collection
  const [agentUser, setAgentUser] = useState(null);   // from 'users' collection
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const loadAgentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      const authUser = auth.currentUser;
      if (!authUser) {
        setError('You must be signed in to view this page.');
        setLoading(false);
        return;
      }

      // Load current user's profile
      const userRef = doc(db, 'users', authUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setError('User profile not found.');
        setLoading(false);
        return;
      }
      const me = { id: userSnap.id, ...userSnap.data() };
      setCurrentUser(me);

      if (me.assigned_agent_id) {
        // Agent's user profile
        const agentUserRef = doc(db, 'users', me.assigned_agent_id);
        const agentUserSnap = await getDoc(agentUserRef);
        if (agentUserSnap.exists()) {
          setAgentUser({ id: agentUserSnap.id, ...agentUserSnap.data() });
        }

        // Agent profile (from 'agents' collection) where user_id == assigned_agent_id
        const agentsQ = query(
          collection(db, 'agents'),
          where('user_id', '==', me.assigned_agent_id),
          limit(1)
        );
        const agentsSnap = await getDocs(agentsQ);
        if (!agentsSnap.empty) {
          const docSnap = agentsSnap.docs[0];
          setAgent({ id: docSnap.id, ...docSnap.data() });
        }

        // Cases for this student with this agent
        const casesQ = query(
          collection(db, 'cases'),
          where('student_id', '==', me.id || authUser.uid),
          where('agent_id', '==', me.assigned_agent_id),
          orderBy('created_date', 'desc')
        );
        const casesSnap = await getDocs(casesQ);
        const myCases = casesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCases(myCases);
      } else {
        // No agent assigned; just finish
        setAgent(null);
        setAgentUser(null);
        setCases([]);
      }
    } catch (err) {
      console.error('Error loading agent data:', err);
      setError('Failed to load your agent data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgentData();
  }, [loadAgentData]);

  const handleSendMessage = async ({ subject, message }) => {
    try {
      if (!currentUser?.id || !currentUser?.assigned_agent_id) return;

      await addDoc(collection(db, 'agent_messages'), {
        from_user_id: currentUser.id,
        to_user_id: currentUser.assigned_agent_id,
        subject,
        message,
        created_at: serverTimestamp(),
        read: false,
        context: {
          page: 'MyAgent',
          student_name: currentUser.full_name || currentUser.email || currentUser.id,
          agent_name: agentUser?.full_name || agentUser?.email || currentUser.assigned_agent_id,
        }
      });

      setIsContactModalOpen(false);
      alert("Message sent successfully! Your agent will respond soon.");
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <CardTitle className="mb-2">Error</CardTitle>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (!currentUser?.assigned_agent_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center p-12">
            <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Agent Assigned</h2>
            <p className="text-gray-600 mb-6">
              You don't have an assigned education agent yet. Agents provide personalized guidance for your study abroad journey.
            </p>
            <Button asChild>
              <a href="/FindAgent">Find an Agent</a>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            My Education Agent
          </h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Agent Profile */}
          <div className="lg:col-span-1">
            <Card className="mb-6">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                  {agentUser?.full_name?.charAt(0) || 'A'}
                </div>
                <h3 className="text-xl font-bold mb-2">{agentUser?.full_name}</h3>
                <p className="text-gray-600 mb-1">{agent?.company_name}</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge variant={agent?.verification_status === 'verified' ? 'default' : 'secondary'}>
                    {agent?.verification_status === 'verified' ? 'Verified Agent' : 'Pending Verification'}
                  </Badge>
                </div>

                <div className="space-y-2 text-left mb-6">
                  {agentUser?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>{agentUser.email}</span>
                    </div>
                  )}
                  {agent?.contact_person?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{agent.contact_person.phone}</span>
                    </div>
                  )}
                </div>

                <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full mb-3">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Contact {agentUser?.full_name}</DialogTitle>
                    </DialogHeader>
                    <ContactAgentModal
                      agent={agent}
                      onSend={handleSendMessage}
                      onCancel={() => setIsContactModalOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Agent Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Agent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{cases.filter(c => c.status === 'Approved').length}</div>
                    <p className="text-sm text-gray-600">Cases Approved</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{cases.length}</div>
                    <p className="text-sm text-gray-600">Total Cases</p>
                  </div>

                  {Array.isArray(agent?.target_countries) && agent.target_countries.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Specializes in:</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.target_countries.slice(0, 3).map((country, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {country}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cases and Progress */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  My Visa Cases
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cases.length > 0 ? (
                  <div>
                    {cases.map(caseData => (
                      <CaseProgressCard key={caseData.id} caseData={caseData} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Cases</h3>
                    <p className="text-gray-600 mb-4">
                      Your agent will help you start visa applications when you purchase a visa package.
                    </p>
                    <Button asChild>
                      <a href="/VisaPackages">Explore Visa Packages</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services Offered */}
            {Array.isArray(agent?.services_offered) && agent.services_offered.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Services Offered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2">
                    {agent.services_offered.map((service, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">{service}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}