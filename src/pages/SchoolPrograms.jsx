import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { School } from '@/api/entities';
import { Program } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, GraduationCap, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

const ProgramForm = ({ program, school, onSave, onCancel }) => {
  const [formData, setFormData] = useState(program || {
    programTitle: '',
    programLevel: 'Bachelor',
    duration: '',
    tuitionFee: '',
    overview: '',
    costOfLiving: '',
    intakeDates: []
  });
  const [intakeInput, setIntakeInput] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addIntakeDate = () => {
    if (intakeInput.trim() && !formData.intakeDates.includes(intakeInput.trim())) {
      setFormData(prev => ({
        ...prev,
        intakeDates: [...prev.intakeDates, intakeInput.trim()]
      }));
      setIntakeInput('');
    }
  };

  const removeIntakeDate = (dateToRemove) => {
    setFormData(prev => ({
      ...prev,
      intakeDates: prev.intakeDates.filter(date => date !== dateToRemove)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const programData = {
      ...formData,
      schoolId: school.id,
      tuitionFee: formData.tuitionFee ? parseFloat(formData.tuitionFee) : 0,
      costOfLiving: formData.costOfLiving ? parseFloat(formData.costOfLiving) : 0
    };
    onSave(programData);
  };

  const levels = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Diploma', 'Bachelor', 'Master', 'PhD'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="programTitle">Program Title *</Label>
          <Input
            id="programTitle"
            value={formData.programTitle}
            onChange={(e) => handleChange('programTitle', e.target.value)}
            placeholder="e.g., Bachelor of Computer Science"
            required
          />
        </div>

        <div>
          <Label htmlFor="programLevel">Program Level *</Label>
          <Select
            value={formData.programLevel}
            onValueChange={(value) => handleChange('programLevel', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levels.map(level => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            value={formData.duration}
            onChange={(e) => handleChange('duration', e.target.value)}
            placeholder="e.g., 4 years, 2 semesters"
          />
        </div>

        <div>
          <Label htmlFor="tuitionFee">Annual Tuition Fee (CAD)</Label>
          <Input
            id="tuitionFee"
            type="number"
            value={formData.tuitionFee}
            onChange={(e) => handleChange('tuitionFee', e.target.value)}
            placeholder="25000"
          />
        </div>

        <div>
          <Label htmlFor="costOfLiving">Cost of Living (CAD)</Label>
          <Input
            id="costOfLiving"
            type="number"
            value={formData.costOfLiving}
            onChange={(e) => handleChange('costOfLiving', e.target.value)}
            placeholder="15000"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="overview">Program Overview</Label>
        <Textarea
          id="overview"
          value={formData.overview}
          onChange={(e) => handleChange('overview', e.target.value)}
          placeholder="Describe the program, its objectives, and what students will learn..."
          rows={4}
        />
      </div>

      <div>
        <Label>Intake Dates</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={intakeInput}
            onChange={(e) => setIntakeInput(e.target.value)}
            placeholder="e.g., September 2024"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIntakeDate())}
          />
          <Button type="button" onClick={addIntakeDate}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.intakeDates.map(date => (
            <Badge key={date} variant="secondary" className="cursor-pointer" onClick={() => removeIntakeDate(date)}>
              {date} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {program ? 'Update Program' : 'Create Program'}
        </Button>
      </div>
    </form>
  );
};

export default function SchoolPrograms() {
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.user_type !== 'school') {
        setError('Access denied. Only schools can manage programs.');
        return;
      }

      // Find the school associated with this user
      const schools = await School.list();
      const userSchool = schools.find(s => s.user_id === currentUser.id);
      
      if (!userSchool) {
        setError('No school profile found. Please complete your school profile first.');
        return;
      }

      setSchool(userSchool);

      // Load programs for this school
      const allPrograms = await Program.list();
      const schoolPrograms = allPrograms.filter(p => p.schoolId === userSchool.id);
      setPrograms(schoolPrograms);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProgram = async (programData) => {
    try {
      if (selectedProgram) {
        await Program.update(selectedProgram.id, programData);
      } else {
        await Program.create(programData);
      }
      
      setIsFormOpen(false);
      setSelectedProgram(null);
      await loadData();
    } catch (error) {
      console.error('Error saving program:', error);
      alert('Failed to save program. Please try again.');
    }
  };

  const handleDeleteProgram = async (programId) => {
    if (window.confirm('Are you sure you want to delete this program?')) {
      try {
        await Program.delete(programId);
        await loadData();
      } catch (error) {
        console.error('Error deleting program:', error);
        alert('Failed to delete program. Please try again.');
      }
    }
  };

  const openForm = (program = null) => {
    setSelectedProgram(program);
    setIsFormOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Programs</h1>
          <p className="text-gray-600 mt-2">Manage your school's academic programs</p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openForm()}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Program
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedProgram ? 'Edit Program' : 'Add New Program'}
              </DialogTitle>
            </DialogHeader>
            <ProgramForm
              program={selectedProgram}
              school={school}
              onSave={handleSaveProgram}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {programs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Programs ({programs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program Title</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Tuition Fee</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">{program.programTitle}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{program.programLevel}</Badge>
                    </TableCell>
                    <TableCell>{program.duration || 'Not specified'}</TableCell>
                    <TableCell>
                      {program.tuitionFee ? `$${program.tuitionFee.toLocaleString()}` : 'Not specified'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openForm(program)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteProgram(program.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Programs Yet</h3>
            <p className="text-gray-600 mb-4">Start by adding your first academic program.</p>
            <Button onClick={() => openForm()}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Your First Program
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}