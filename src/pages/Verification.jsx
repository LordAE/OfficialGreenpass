
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, CheckCircle, XCircle, Clock, Building, Users as UsersIcon, BookOpen, Store, UserCheck, Briefcase, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Import User entity (always required)
import { User } from '@/api/entities';

// Import other entities - these may or may not exist
import { Agent } from '@/api/entities';
import { Tutor } from '@/api/entities';
import { Vendor } from '@/api/entities';
import { School } from '@/api/entities';

const StatusBadge = ({ status }) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    verified: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800"
  };
  return <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
};

const VerificationActions = ({ item, onApprove, onReject, entityType }) => (
  <div className="flex gap-2">
    <Button asChild variant="ghost" size="sm" className="w-8 h-8">
      <Link to={createPageUrl(`UserDetails?id=${item.user_id || item.id}`)}>
        <Eye className="w-4 h-4" />
      </Link>
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onApprove(item, entityType)} className="w-8 h-8 text-green-600">
      <CheckCircle className="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onReject(item, entityType)} className="w-8 h-8 text-red-600">
      <XCircle className="w-4 h-4" />
    </Button>
  </div>
);

export default function Verification() {
  const [agents, setAgents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [schools, setSchools] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]); // This will hold pending general users
  const [students, setStudents] = useState([]); // This will hold pending student users
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // State for handling overall component errors

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null); // Clear any previous errors on new load attempt
      
      try {
        // Add delays between API calls to prevent rate limiting
        let userData = [];
        try {
          userData = await User.list();
          await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
        } catch (err) {
          console.error('Error loading users:', err);
        }

        let agentData = [];
        if (Agent && typeof Agent.filter === 'function') {
          try {
            agentData = await Agent.filter({ verification_status: 'pending' });
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (err) {
            console.error('Error loading agents:', err);
          }
        } else {
          console.warn('Agent entity not available or filter method missing');
        }

        let tutorData = [];
        if (Tutor && typeof Tutor.filter === 'function') {
          try {
            tutorData = await Tutor.filter({ verification_status: 'pending' });
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (err) {
            console.error('Error loading tutors:', err);
          }
        } else {
          console.warn('Tutor entity not available or filter method missing');
        }

        let schoolData = [];
        if (School && typeof School.filter === 'function') {
          try {
            schoolData = await School.filter({ verification_status: 'pending' });
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (err) {
            console.error('Error loading schools:', err);
          }
        } else {
          console.warn('School entity not available or filter method missing');
        }

        let vendorData = [];
        if (Vendor && typeof Vendor.filter === 'function') {
          try {
            vendorData = await Vendor.filter({ verification_status: 'pending' });
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (err) {
            console.error('Error loading vendors:', err);
          }
        } else {
          console.warn('Vendor entity not available or filter method missing');
        }

        // Create user map for quick lookups
        // Ensure userData is an array before processing
        const userMapping = (Array.isArray(userData) ? userData : []).reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
        setUserMap(userMapping);

        // Filter pending users and students based on onboarding_completed status
        // Ensure userData is an array before filtering
        const pendingUsers = (Array.isArray(userData) ? userData : []).filter(user => 
          user.user_type === 'user' && !user.onboarding_completed
        );
        const pendingStudents = (Array.isArray(userData) ? userData : []).filter(user => 
          user.user_type === 'student' && !user.onboarding_completed
        );

        // Set states, ensuring data is always an array
        setAgents(Array.isArray(agentData) ? agentData : []);
        setTutors(Array.isArray(tutorData) ? tutorData : []);
        setSchools(Array.isArray(schoolData) ? schoolData : []);
        setVendors(Array.isArray(vendorData) ? vendorData : []);
        setUsers(pendingUsers);
        setStudents(pendingStudents);
      } catch (err) {
        // Catch any unexpected errors that might occur during the data loading process
        console.error("Critical error loading verification data:", err);
        setError("Failed to load verification data. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleApprove = async (item, entityType) => {
    try {
      const updateData = { verification_status: 'verified' };
      
      switch (entityType) {
        case 'agent':
          // Check if Agent entity and its update method exist before calling
          if (Agent && typeof Agent.update === 'function') {
            await Agent.update(item.id, updateData);
            setAgents(prev => prev.filter(a => a.id !== item.id));
          } else {
            console.warn(`Agent entity or update method not available for approval. Item ID: ${item.id}`);
            alert('Agent verification service is not available. Please contact support.');
          }
          break;
        case 'tutor':
          if (Tutor && typeof Tutor.update === 'function') {
            await Tutor.update(item.id, updateData);
            setTutors(prev => prev.filter(t => t.id !== item.id));
          } else {
            console.warn(`Tutor entity or update method not available for approval. Item ID: ${item.id}`);
            alert('Tutor verification service is not available. Please contact support.');
          }
          break;
        case 'school':
          if (School && typeof School.update === 'function') {
            await School.update(item.id, updateData);
            setSchools(prev => prev.filter(s => s.id !== item.id));
          } else {
            console.warn(`School entity or update method not available for approval. Item ID: ${item.id}`);
            alert('School verification service is not available. Please contact support.');
          }
          break;
        case 'vendor':
          if (Vendor && typeof Vendor.update === 'function') {
            await Vendor.update(item.id, updateData);
            setVendors(prev => prev.filter(v => v.id !== item.id));
          } else {
            console.warn(`Vendor entity or update method not available for approval. Item ID: ${item.id}`);
            alert('Vendor verification service is not available. Please contact support.');
          }
          break;
        case 'user':
        case 'student':
          // User entity is assumed to always be available and updateable
          await User.update(item.id, { onboarding_completed: true });
          if (entityType === 'user') {
            setUsers(prev => prev.filter(u => u.id !== item.id));
          } else { // entityType is 'student'
            setStudents(prev => prev.filter(s => s.id !== item.id));
          }
          break;
        default:
          console.warn(`Unknown entity type for approval: ${entityType}`);
          alert('Failed to approve: Unknown entity type.');
          break;
      }
    } catch (err) {
      console.error('Error approving item:', err);
      alert('Failed to approve item. Please try again.');
    }
  };

  const handleReject = async (item, entityType) => {
    try {
      const updateData = { verification_status: 'rejected' };
      
      switch (entityType) {
        case 'agent':
          if (Agent && typeof Agent.update === 'function') {
            await Agent.update(item.id, updateData);
            setAgents(prev => prev.filter(a => a.id !== item.id));
          } else {
            console.warn(`Agent entity or update method not available for rejection. Item ID: ${item.id}`);
            alert('Agent verification service is not available. Please contact support.');
          }
          break;
        case 'tutor':
          if (Tutor && typeof Tutor.update === 'function') {
            await Tutor.update(item.id, updateData);
            setTutors(prev => prev.filter(t => t.id !== item.id));
          } else {
            console.warn(`Tutor entity or update method not available for rejection. Item ID: ${item.id}`);
            alert('Tutor verification service is not available. Please contact support.');
          }
          break;
        case 'school':
          if (School && typeof School.update === 'function') {
            await School.update(item.id, updateData);
            setSchools(prev => prev.filter(s => s.id !== item.id));
          } else {
            console.warn(`School entity or update method not available for rejection. Item ID: ${item.id}`);
            alert('School verification service is not available. Please contact support.');
          }
          break;
        case 'vendor':
          if (Vendor && typeof Vendor.update === 'function') {
            await Vendor.update(item.id, updateData);
            setVendors(prev => prev.filter(v => v.id !== item.id));
          } else {
            console.warn(`Vendor entity or update method not available for rejection. Item ID: ${item.id}`);
            alert('Vendor verification service is not available. Please contact support.');
          }
          break;
        case 'user':
        case 'student':
          // For rejection, we explicitly set onboarding_completed to false
          await User.update(item.id, { onboarding_completed: false }); 
          if (entityType === 'user') {
            setUsers(prev => prev.filter(u => u.id !== item.id));
          } else { // entityType is 'student'
            setStudents(prev => prev.filter(s => s.id !== item.id));
          }
          break;
        default:
          console.warn(`Unknown entity type for rejection: ${entityType}`);
          alert('Failed to reject: Unknown entity type.');
          break;
      }
    } catch (err) {
      console.error('Error rejecting item:', err);
      alert('Failed to reject item. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-red-600">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const totalPending = agents.length + tutors.length + schools.length + vendors.length + users.length + students.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <UserCheck className="w-8 h-8 text-emerald-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            Verification Management
          </h1>
        </div>

        <Card className="mb-8 shadow-lg">
            <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg">
                    <Clock className="w-8 h-8 text-emerald-600"/>
                </div>
                <div>
                    <div className="text-3xl font-bold text-emerald-700">{totalPending}</div>
                    <p className="text-gray-600">Pending Verifications</p>
                </div>
            </CardContent>
        </Card>

        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white/80 backdrop-blur-sm">
            {/* Conditionally render TabsTrigger based on whether the entity was successfully loaded */}
            {Agent && <TabsTrigger value="agents"><Briefcase className="w-4 h-4 mr-2"/>Agents ({agents.length})</TabsTrigger>}
            {Tutor && <TabsTrigger value="tutors"><BookOpen className="w-4 h-4 mr-2"/>Tutors ({tutors.length})</TabsTrigger>}
            {School && <TabsTrigger value="schools"><Building className="w-4 h-4 mr-2"/>Schools ({schools.length})</TabsTrigger>}
            {Vendor && <TabsTrigger value="vendors"><Store className="w-4 h-4 mr-2"/>Vendors ({vendors.length})</TabsTrigger>}
            <TabsTrigger value="users"><UsersIcon className="w-4 h-4 mr-2"/>Users ({users.length})</TabsTrigger>
            <TabsTrigger value="students"><UsersIcon className="w-4 h-4 mr-2"/>Students ({students.length})</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="w-5 h-5" />
                  Pending Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {users.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Submitted Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(user => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.country || 'N/A'}</TableCell>
                          <TableCell>{format(new Date(user.created_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <VerificationActions 
                              item={user} 
                              onApprove={handleApprove} 
                              onReject={handleReject}
                              entityType="user"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Users</h3>
                    <p className="text-gray-600">All users have completed verification.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="w-5 h-5" />
                  Pending Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                {students.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Program Enrolled</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Submitted Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map(student => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          {/* Use optional chaining for properties that might not exist on a base user, or provide fallbacks */}
                          <TableCell>{student.programId || 'N/A'}</TableCell>
                          <TableCell>{student.schoolId || 'N/A'}</TableCell>
                          <TableCell>{format(new Date(student.created_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <VerificationActions 
                              item={student} 
                              onApprove={handleApprove} 
                              onReject={handleReject}
                              entityType="student"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Students</h3>
                    <p className="text-gray-600">All students have completed verification.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conditionally render TabsContent for other entities */}
          {Agent && (
            <TabsContent value="agents">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Pending Agent Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agents.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Contact Person</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Business License</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agents.map(agent => {
                          const user = userMap[agent.user_id];
                          return (
                            <TableRow key={agent.id}>
                              <TableCell className="font-medium">{agent.company_name}</TableCell>
                              <TableCell>{agent.contact_person?.name || user?.full_name}</TableCell>
                              <TableCell>{agent.contact_person?.email || user?.email}</TableCell>
                              <TableCell>{agent.business_license_mst}</TableCell>
                              <TableCell>{format(new Date(agent.created_date), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                <VerificationActions 
                                  item={agent} 
                                  onApprove={handleApprove} 
                                  onReject={handleReject}
                                  entityType="agent"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Agents</h3>
                      <p className="text-gray-600">All agents have been verified.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {Tutor && (
            <TabsContent value="tutors">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Pending Tutor Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tutors.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Specializations</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tutors.map(tutor => {
                          const user = userMap[tutor.user_id];
                          return (
                            <TableRow key={tutor.id}>
                              <TableCell className="font-medium">{user?.full_name}</TableCell>
                              <TableCell>{user?.email}</TableCell>
                              <TableCell>{tutor.specializations?.join(', ')}</TableCell>
                              <TableCell>{tutor.experience_years} years</TableCell>
                              <TableCell>${tutor.hourly_rate}/hr</TableCell>
                              <TableCell>{format(new Date(tutor.created_date), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                <VerificationActions 
                                  item={tutor} 
                                  onApprove={handleApprove} 
                                  onReject={handleReject}
                                  entityType="tutor"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Tutors</h3>
                      <p className="text-gray-600">All tutors have been verified.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {School && (
            <TabsContent value="schools">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Pending School Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {schools.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>School Name</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Account Type</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schools.map(school => {
                          const user = userMap[school.user_id];
                          return (
                            <TableRow key={school.id}>
                              <TableCell className="font-medium">{school.name}</TableCell>
                              <TableCell>{school.location}, {school.country}</TableCell>
                              <TableCell>{user?.email}</TableCell>
                              <TableCell>
                                <Badge className={school.account_type === 'real' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                  {school.account_type || 'real'}
                                </Badge>
                              </TableCell>
                              <TableCell>{format(new Date(school.created_date), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                <VerificationActions 
                                  item={school} 
                                  onApprove={handleApprove} 
                                  onReject={handleReject}
                                  entityType="school"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Schools</h3>
                      <p className="text-gray-600">All schools have been verified.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {Vendor && (
            <TabsContent value="vendors">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Pending Vendor Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vendors.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Business Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Service Categories</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendors.map(vendor => {
                          const user = userMap[vendor.user_id];
                          return (
                            <TableRow key={vendor.id}>
                              <TableCell className="font-medium">{vendor.business_name}</TableCell>
                              <TableCell>{user?.email}</TableCell>
                              <TableCell>{vendor.service_categories?.join(', ')}</TableCell>
                              <TableCell>{format(new Date(vendor.created_date), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                <VerificationActions 
                                  item={vendor} 
                                  onApprove={handleApprove} 
                                  onReject={handleReject}
                                  entityType="vendor"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Vendors</h3>
                      <p className="text-gray-600">All vendors have been verified.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
