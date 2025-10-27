// src/pages/SchoolPrograms.jsx
import React, { useState, useEffect } from 'react';
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

/* ---------- Firebase ---------- */
import { db, auth } from "@/firebase";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc,
  getDocs, query, where, serverTimestamp
} from "firebase/firestore";

/* ===============================
   Form
================================ */
const ProgramForm = ({ program, school, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    programTitle: program?.programTitle || '',
    programLevel: program?.programLevel || 'Bachelor',
    duration: program?.duration || '',
    tuitionFee: program?.tuitionFee || '',
    overview: program?.overview || '',
    costOfLiving: program?.costOfLiving || '',
    intakeDates: program?.intakeDates || [],
  });
  const [intakeInput, setIntakeInput] = useState('');

  useEffect(() => {
    if (program) {
      setFormData({
        programTitle: program.programTitle || '',
        programLevel: program.programLevel || 'Bachelor',
        duration: program.duration || '',
        tuitionFee: program.tuitionFee || '',
        overview: program.overview || '',
        costOfLiving: program.costOfLiving || '',
        intakeDates: program.intakeDates || [],
      });
    }
  }, [program]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const addIntakeDate = () => {
    const v = intakeInput.trim();
    if (v && !formData.intakeDates.includes(v)) {
      setFormData(prev => ({ ...prev, intakeDates: [...prev.intakeDates, v] }));
      setIntakeInput('');
    }
  };
  const removeIntakeDate = (v) =>
    setFormData(prev => ({ ...prev, intakeDates: prev.intakeDates.filter(x => x !== v) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      schoolId: school.id, // used by the payload builder
      tuitionFee: formData.tuitionFee ? Number(formData.tuitionFee) : 0,
      costOfLiving: formData.costOfLiving ? Number(formData.costOfLiving) : 0,
    };
    onSave(payload);
  };

  const levels = ['Grade 9','Grade 10','Grade 11','Grade 12','Diploma','Bachelor','Master','PhD'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="programTitle">Program Title *</Label>
          <Input id="programTitle" value={formData.programTitle}
            onChange={(e)=>handleChange('programTitle', e.target.value)}
            placeholder="e.g., Bachelor of Computer Science" required />
        </div>

        <div>
          <Label htmlFor="programLevel">Program Level *</Label>
          <Select value={formData.programLevel} onValueChange={(v)=>handleChange('programLevel', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {levels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="duration">Duration</Label>
          <Input id="duration" value={formData.duration}
            onChange={(e)=>handleChange('duration', e.target.value)}
            placeholder="e.g., 4 years, 2 semesters" />
        </div>

        <div>
          <Label htmlFor="tuitionFee">Annual Tuition Fee (CAD)</Label>
          <Input id="tuitionFee" type="number" value={formData.tuitionFee}
            onChange={(e)=>handleChange('tuitionFee', e.target.value)} placeholder="25000" />
        </div>

        <div>
          <Label htmlFor="costOfLiving">Cost of Living (CAD)</Label>
          <Input id="costOfLiving" type="number" value={formData.costOfLiving}
            onChange={(e)=>handleChange('costOfLiving', e.target.value)} placeholder="15000" />
        </div>
      </div>

      <div>
        <Label htmlFor="overview">Program Overview</Label>
        <Textarea id="overview" rows={4} value={formData.overview}
          onChange={(e)=>handleChange('overview', e.target.value)}
          placeholder="Describe the program, its objectives, and what students will learn..." />
      </div>

      <div>
        <Label>Intake Dates</Label>
        <div className="flex gap-2 mb-2">
          <Input value={intakeInput} onChange={(e)=>setIntakeInput(e.target.value)}
            placeholder="e.g., September 2024"
            onKeyDown={(e)=> e.key === 'Enter' && (e.preventDefault(), addIntakeDate()) }/>
          <Button type="button" onClick={addIntakeDate}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.intakeDates.map(date => (
            <Badge key={date} variant="secondary" className="cursor-pointer" onClick={()=>removeIntakeDate(date)}>
              {date} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{program ? 'Update Program' : 'Create Program'}</Button>
      </div>
    </form>
  );
};

/* ===============================
   Page
================================ */
export default function SchoolPrograms() {
  const [school, setSchool] = useState(null);     // school profile (from school_profiles)
  const [programs, setPrograms] = useState([]);   // docs stored in 'schools'
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [error, setError] = useState(null);

  useEffect(()=>{ loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!auth.currentUser) throw new Error('Not signed in');
      const uid = auth.currentUser.uid;

      // 1) Load the school profile from school_profiles/{uid}
      const profSnap = await getDoc(doc(db, 'school_profiles', uid));
      if (!profSnap.exists()) {
        setError('No school profile found. Please complete your school profile first.');
        return;
      }
      const profile = { id: uid, ...profSnap.data() };
      setSchool(profile);

      // 2) Load programs from 'schools' owned by this user.
      //    We only filter by user_id to avoid needing a composite index,
      //    then filter by school_id on the client.
      const q = query(collection(db, 'schools'), where('user_id', '==', uid));
      const snap = await getDocs(q);

      const rows = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(x => (x.school_id === uid)) // only this user's school
        .map(x => {
          const createdAt =
            x?.created_at?.toMillis ? x.created_at.toMillis() :
            x?.created_at?.seconds ? x.created_at.seconds * 1000 : 0;

          return {
            id: x.id,
            programTitle: x.program_title || '',
            programLevel: x.program_level || '',
            duration: x.duration_display || '',
            tuitionFee: x.tuition_fee_cad || 0,
            costOfLiving: x.cost_of_living_cad || 0,
            overview: x.program_overview || '',
            intakeDates: Array.isArray(x.intake_dates) ? x.intake_dates : [],
            _createdAt: createdAt,
          };
        })
        .sort((a,b) => b._createdAt - a._createdAt)
        .map(({ _createdAt, ...rest }) => rest);

      setPrograms(rows);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toFirestorePayload = (programData) => {
    const uid = auth.currentUser.uid;
    const schoolType =
      (school?.is_public === 'public' || school?.isPublic === true) ? 'Public' :
      (school?.is_public === 'private' || school?.isPublic === false) ? 'Private' : '';

    return {
      // ownership/filtering
      user_id: uid,
      school_id: school.id, // school_profiles doc id == uid

      // program-specific
      program_title: programData.programTitle,
      program_level: programData.programLevel,
      duration_display: programData.duration || '',
      tuition_fee_cad: Number(programData.tuitionFee || 0),
      cost_of_living_cad: Number(programData.costOfLiving || 0),
      program_overview: programData.overview || '',
      intake_dates: programData.intakeDates || [],

      // info mirrored from profile
      institution_name: school?.name || school?.institution_name || school?.school_name || '',
      institution_logo_url: school?.logo_url || school?.image_url || school?.institution_logo_url || '',
      institution_website: school?.website || school?.institution_website || '',
      school_name: school?.name || school?.school_name || '',
      school_city: school?.location || school?.city || '',
      school_province: school?.province || '',
      school_country: school?.country || '',
      school_type: schoolType,
      is_dli: Boolean(school?.is_dli ?? school?.isDLI ?? false),
      dli_number: school?.dli_number || '',
      application_fee: Number(school?.application_fee || 0),

      // UI toggles
      is_active: true,
      is_featured: false,

      updated_at: serverTimestamp(),
      created_at: serverTimestamp(),
    };
  };

  const handleSaveProgram = async (programData) => {
    try {
      if (!auth.currentUser) throw new Error('Not signed in');

      if (selectedProgram) {
        const ref = doc(db, 'schools', selectedProgram.id);
        const payload = toFirestorePayload(programData);
        delete payload.created_at; // keep original create time
        await updateDoc(ref, payload);
      } else {
        const payload = toFirestorePayload(programData);
        await addDoc(collection(db, 'schools'), payload);
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
    if (!window.confirm('Are you sure you want to delete this program?')) return;
    try {
      await deleteDoc(doc(db, 'schools', programId));
      await loadData();
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Failed to delete program. Please try again.');
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
              <DialogTitle>{selectedProgram ? 'Edit Program' : 'Add New Program'}</DialogTitle>
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
                    <TableCell><Badge variant="secondary">{program.programLevel}</Badge></TableCell>
                    <TableCell>{program.duration || 'Not specified'}</TableCell>
                    <TableCell>{program.tuitionFee ? `$${program.tuitionFee.toLocaleString()}` : 'Not specified'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openForm(program)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteProgram(program.id)}>
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
