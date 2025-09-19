// src/pages/AdminSchools.jsx
import React, { useState, useEffect, useCallback } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  Edit,
  Trash2,
  Search,
  Loader2,
  School as SchoolIcon,
  Database,
} from "lucide-react";

import SchoolForm from "../components/admin/SchoolForm";
import MasterDataSeeder from "../components/admin/MasterDataSeeder";

const COLL = "schools"; // collection name in Firestore

export default function AdminSchools() {
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadSchools = useCallback(async () => {
  setLoading(true);
  try {
    const snap = await getDocs(collection(db, COLL));
    // Map and normalize
    const data = snap.docs.map((d) => {
      const obj = { id: d.id, ...d.data() };
      // created_at can be a Firestore Timestamp or missing
      const ts = obj.created_at && typeof obj.created_at.toMillis === "function"
        ? obj.created_at.toMillis()
        : 0;
      return { ...obj, __createdAtMs: ts };
    });

    // Sort newest first, but include everything
    data.sort((a, b) => b.__createdAtMs - a.__createdAtMs);

    const safe = Array.isArray(data) ? data.filter((x) => x && typeof x === "object") : [];
    setSchools(safe);
    setFilteredSchools(safe);
  } catch (error) {
    console.error("Error loading school programs:", error);
    setSchools([]);
    setFilteredSchools([]);
    alert("Failed to load school programs.");
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSchools(schools);
      return;
    }
    const t = searchTerm.toLowerCase();
    const filtered = schools.filter((s) => {
      const a = (s?.school_name || "").toLowerCase();
      const b = (s?.program_title || "").toLowerCase();
      const c = (s?.institution_name || "").toLowerCase();
      const d = (s?.school_city || "").toLowerCase();
      return a.includes(t) || b.includes(t) || c.includes(t) || d.includes(t);
    });
    setFilteredSchools(filtered);
  }, [schools, searchTerm]);

  const handleSave = async (formData) => {
    try {
      if (selectedSchool?.id) {
        await updateDoc(doc(db, COLL, selectedSchool.id), {
          ...formData,
          updated_at: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, COLL), {
          ...formData,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }
      setIsFormOpen(false);
      setSelectedSchool(null);
      await loadSchools();
    } catch (error) {
      console.error("Error saving school program:", error);
      alert("Failed to save school program. Please try again.");
    }
  };

  const handleDelete = async (schoolId) => {
    if (!schoolId) return;
    if (window.confirm("Are you sure you want to delete this school program? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, COLL, schoolId));
        await loadSchools();
      } catch (error) {
        console.error("Error deleting school program:", error);
        alert("Failed to delete school program. Please try again.");
      }
    }
  };

  const openForm = (school = null) => {
    setSelectedSchool(school);
    setIsFormOpen(true);
  };

  const handleSeedSuccess = () => {
    alert("Database seeded successfully! Reloading programs...");
    loadSchools();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <SchoolIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">School Program Management</h1>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openForm()}>
                <PlusCircle className="w-4 h-4 mr-2" /> Add Program
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{selectedSchool ? "Edit School Program" : "Add New School Program"}</DialogTitle>
              </DialogHeader>
              <SchoolForm
                school={selectedSchool}
                onSave={handleSave}
                onCancel={() => {
                  setIsFormOpen(false);
                  setSelectedSchool(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Database className="w-5 h-5" />
              Master Data Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700 mb-4">
              If your lists are empty, you can seed the database with comprehensive sample data. This will populate Institutions,
              School Programs, and School Profiles.
            </p>
            <MasterDataSeeder onSeedSuccess={handleSeedSuccess} />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by school, program, institution, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SchoolIcon className="w-5 h-5" />
              School Programs ({filteredSchools.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : !filteredSchools || filteredSchools.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No school programs found. Use the "Master Data Operations" to seed the database.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program Title</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">{school.program_title}</TableCell>
                      <TableCell>{school.school_name}</TableCell>
                      <TableCell>{school.institution_name || "N/A"}</TableCell>
                      <TableCell>
                        {school.school_city}
                        {school.school_province ? `, ${school.school_province}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(school.program_level || "").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openForm(school)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(school.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
