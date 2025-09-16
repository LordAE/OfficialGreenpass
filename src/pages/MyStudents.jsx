import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Case } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Loader2, Search, ArrowRight, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MyStudents() {
  const [students, setStudents] = useState([]);
  const [cases, setCases] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [agent, setAgent] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const currentAgent = await User.me();
        setAgent(currentAgent);

        const studentData = await User.filter({ referred_by_agent_id: currentAgent.id });
        setStudents(studentData);

        if (studentData.length > 0) {
          const studentIds = studentData.map(s => s.id);
          const caseData = await Case.filter({ student_id: { $in: studentIds } });
          
          const casesByStudent = caseData.reduce((acc, currentCase) => {
            if (!acc[currentCase.student_id]) {
              acc[currentCase.student_id] = [];
            }
            acc[currentCase.student_id].push(currentCase);
            return acc;
          }, {});
          setCases(casesByStudent);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">My Students</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Referred Students List</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by student name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
           {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Active Cases</TableHead>
                  <TableHead>Profile Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map(student => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="font-medium">{student.full_name}</div>
                      <div className="text-sm text-muted-foreground">{student.email}</div>
                    </TableCell>
                    <TableCell>{format(new Date(student.created_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{cases[student.id]?.length || 0}</TableCell>
                    <TableCell>
                      <Badge variant={student.onboarding_completed ? 'default' : 'secondary'}>
                        {student.onboarding_completed ? 'Complete' : 'Incomplete'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link to={createPageUrl(`UserDetails?id=${student.id}`)}>
                        <Button variant="outline" size="sm">
                          View Details <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {filteredStudents.map(student => (
              <Card key={student.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{student.full_name}</p>
                    <p className="text-sm text-gray-500">{student.email}</p>
                  </div>
                   <Link to={createPageUrl(`UserDetails?id=${student.id}`)}>
                      <Button variant="ghost" size="icon">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                  <div>
                    <p className="text-gray-500">Cases</p>
                    <p className="font-semibold">{cases[student.id]?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <Badge variant={student.onboarding_completed ? 'default' : 'secondary'} className="mt-1">
                      {student.onboarding_completed ? 'Complete' : 'Incomplete'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">No students match your search criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}