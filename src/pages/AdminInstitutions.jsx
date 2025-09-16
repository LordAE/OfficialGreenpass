
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Building, CheckCircle, XCircle, Search, Loader2 } from "lucide-react";
import InstitutionForm from '../components/institutions/InstitutionForm';
import { Institution } from '@/api/entities';

export default function AdminInstitutions() {
  const [institutions, setInstitutions] = useState([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadInstitutions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Institution.list();
      // Ensure data is always a valid array
      const safeData = (data && Array.isArray(data)) ? data.filter(item => item && typeof item === 'object') : [];
      setInstitutions(safeData);
      setFilteredInstitutions(safeData);
    } catch (error) {
      console.error("Error loading institutions:", error);
      setInstitutions([]);
      setFilteredInstitutions([]);
      alert("Failed to load institutions. Please check if the Institution entity is defined correctly.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  useEffect(() => {
    if (!Array.isArray(institutions)) {
      setFilteredInstitutions([]);
      return;
    }

    if (searchTerm.trim() === '') {
      setFilteredInstitutions(institutions);
    } else {
      const filtered = institutions.filter(institution => {
        if (!institution) return false;
        const name = institution.name || '';
        const city = institution.city || '';
        const province = institution.province || '';
        
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               city.toLowerCase().includes(searchTerm.toLowerCase()) ||
               province.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredInstitutions(filtered);
    }
  }, [institutions, searchTerm]);

  const handleSave = async (institutionData) => {
    try {
      if (selectedInstitution) {
        await Institution.update(selectedInstitution.id, institutionData);
      } else {
        await Institution.create(institutionData);
      }
      setIsFormOpen(false);
      setSelectedInstitution(null);
      await loadInstitutions();
    } catch (error) {
      console.error("Error saving institution:", error);
      alert("Failed to save institution. Please try again.");
    }
  };

  const handleDelete = async (institutionId) => {
    if (window.confirm("Are you sure you want to delete this institution?")) {
      try {
        await Institution.delete(institutionId);
        await loadInstitutions();
      } catch (error) {
        console.error("Error deleting institution:", error);
        alert("Failed to delete institution. Please try again.");
      }
    }
  };

  const openForm = (institution = null) => {
    setSelectedInstitution(institution);
    setIsFormOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">Institution Management</h1>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openForm()}>
                <PlusCircle className="w-4 h-4 mr-2" /> Add Institution
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedInstitution ? "Edit Institution" : "Add New Institution"}</DialogTitle>
              </DialogHeader>
              <InstitutionForm
                institution={selectedInstitution}
                onSave={handleSave}
                onCancel={() => { setIsFormOpen(false); setSelectedInstitution(null); }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search institutions by name, city, or province..."
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
              <Building className="w-5 h-5" />
              Institutions ({filteredInstitutions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!filteredInstitutions || filteredInstitutions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No institutions found. Add your first institution to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institution</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Programs</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstitutions.map((institution) => (
                    <TableRow key={institution.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {institution.logoUrl && (
                            <img
                              src={institution.logoUrl}
                              alt={institution.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">{institution.name}</div>
                            {institution.website && (
                              <div className="text-sm text-gray-500">{institution.website}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{institution.city}, {institution.province}</div>
                          <div className="text-gray-500">{institution.country}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {institution.isFeatured && <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>}
                          {institution.isDLI ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              DLI
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="w-3 h-3 mr-1" />
                              Non-DLI
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{institution.programCount || 0} programs</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openForm(institution)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDelete(institution.id)}
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
