import React, { useState, useEffect, useCallback } from 'react';
import { Reservation } from '@/api/entities';
import { User } from '@/api/entities';
import { School } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Mail, Phone, GraduationCap, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';

const StatusBadge = ({ status }) => {
  const colors = {
    confirmed: "bg-green-100 text-green-800",
    pending_payment: "bg-yellow-100 text-yellow-800",
    expired: "bg-red-100 text-red-800",
    credited: "bg-blue-100 text-blue-800",
    cancelled: "bg-gray-100 text-gray-800",
  };
  return <Badge className={`${colors[status] || "bg-gray-100 text-gray-800"} capitalize`}>{status.replace('_', ' ')}</Badge>;
};

export default function SchoolLeads() { 
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      const schoolData = await School.filter({ user_id: currentUser.id });
      
      if (schoolData.length === 0) {
        setLeads([]);
        return;
      }
      
      const school = schoolData[0];
      const reservations = await Reservation.filter({ school_id: school.id }, '-created_date');
      
      if (reservations.length > 0) {
        const studentIds = [...new Set(reservations.map(r => r.student_id))];
        const studentsData = await User.filter({ id: { $in: studentIds } });
        
        const studentsMap = studentsData.reduce((acc, s) => {
          acc[s.id] = s;
          return acc;
        }, {});

        const combinedLeads = reservations.map(res => ({
          ...res,
          student: studentsMap[res.student_id],
        }));

        setLeads(combinedLeads);
      }
    } catch (error) {
      console.error("Error loading school leads:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filteredLeads = leads.filter(lead =>
    lead.student && (
      lead.student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.program_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const stats = {
    totalLeads: leads.length,
    confirmedReservations: leads.filter(l => l.status === 'confirmed').length,
    pendingReservations: leads.filter(l => l.status === 'pending_payment').length,
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Users className="w-8 h-8 text-blue-700" />
          <h1 className="text-4xl font-bold text-gray-800">
            Student Leads
          </h1>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle>Total Leads</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-blue-600">{stats.totalLeads}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Confirmed Reservations</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-green-600">{stats.confirmedReservations}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Pending Reservations</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-yellow-600">{stats.pendingReservations}</div></CardContent>
          </Card>
        </div>
        
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by student name, email, or program..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Lead Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLeads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Program of Interest</TableHead>
                    <TableHead>Date of Interest</TableHead>
                    <TableHead>Reservation Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        {lead.student ? (
                          <div>
                            <p className="font-medium">{lead.student.full_name}</p>
                            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                              <Mail className="w-3 h-3" /> {lead.student.email}
                            </div>
                            {lead.student.phone && (
                              <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <Phone className="w-3 h-3" /> {lead.student.phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500">Student data not found</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <GraduationCap className="w-4 h-4 text-gray-400" />
                           <span>{lead.program_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(lead.created_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell><StatusBadge status={lead.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
               <div className="text-center py-12">
                <Info className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Leads Found</h3>
                <p className="text-gray-600">When students reserve seats for your programs, they will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}