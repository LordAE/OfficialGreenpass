import React, { useState, useEffect } from 'react';
import { Case } from '@/api/entities';
import { User } from '@/api/entities';
// Remove direct School import and load dynamically when needed
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Eye, MessageCircle, Upload } from 'lucide-react';
import { format } from 'date-fns';

const StatusBadge = ({ status }) => {
  const colors = {
    "Application Started": "bg-blue-100 text-blue-800",
    "Documents Pending": "bg-yellow-100 text-yellow-800", 
    "Under Review": "bg-purple-100 text-purple-800",
    "Approved": "bg-green-100 text-green-800",
    "Rejected": "bg-red-100 text-red-800"
  };
  return <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
};

export default function VisaCases() { 
  const [cases, setCases] = useState([]);
  const [students, setStudents] = useState({});
  const [schools, setSchools] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await User.me();
        
        // Get cases for this agent
        const caseData = await Case.filter({ agent_id: currentUser.id }, '-created_date');
        setCases(caseData);
        
        // Get student and school data
        const studentIds = [...new Set(caseData.map(c => c.student_id))];
        const schoolIds = [...new Set(caseData.map(c => c.school_id).filter(Boolean))];
        
        if (studentIds.length > 0) {
          const studentData = await User.filter({ id: { $in: studentIds } });
          const studentMap = studentData.reduce((acc, student) => {
            acc[student.id] = student;
            return acc;
          }, {});
          setStudents(studentMap);
        }
        
        if (schoolIds.length > 0) {
          try {
            // Dynamically import School entity to avoid build issues
            const { School } = await import('@/api/entities');
            const schoolData = await School.filter({ id: { $in: schoolIds } });
            const schoolMap = schoolData.reduce((acc, school) => {
              acc[school.id] = school;
              return acc;
            }, {});
            setSchools(schoolMap);
          } catch (schoolError) {
            console.warn("Could not load school data:", schoolError);
            // Continue without school data if there's an import issue
          }
        }
      } catch (error) {
        console.error("Error loading cases:", error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const getProgress = (caseData) => {
    if (!caseData.checklist || caseData.checklist.length === 0) return 0;
    const completed = caseData.checklist.filter(item => item.status === 'verified').length;
    return (completed / caseData.checklist.length) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <FileText className="w-8 h-8 text-emerald-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            Visa Cases
          </h1>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Active Visa Cases</CardTitle>
          </CardHeader>
          <CardContent>
            {cases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Case Type</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map(caseData => {
                    const student = students[caseData.student_id];
                    const school = schools[caseData.school_id];
                    const progress = getProgress(caseData);
                    
                    return (
                      <TableRow key={caseData.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{student?.full_name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{student?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{caseData.case_type}</TableCell>
                        <TableCell>{school?.name || 'TBD'}</TableCell>
                        <TableCell><StatusBadge status={caseData.status} /></TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress value={progress} className="h-2" />
                            <div className="text-xs text-gray-500 mt-1">{Math.round(progress)}%</div>
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(caseData.created_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Upload className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Cases</h3>
                <p className="text-gray-600">Visa cases for your referred students will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}