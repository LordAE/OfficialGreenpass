
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { cn } from '@/lib/utils';

export default function PackageEditor({ entity, FormComponent, columns, title, formDialogMaxWidth = "max-w-xl" }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const packageData = await entity.list();
      setPackages(packageData);
    } catch (error) {
      console.error(`Error loading ${title}s:`, error);
    }
    setLoading(false);
  }, [entity, title]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleSave = async (pkgData) => {
    try {
      if (selectedPackage) {
        await entity.update(selectedPackage.id, pkgData);
      } else {
        await entity.create(pkgData);
      }
      setIsFormOpen(false);
      setSelectedPackage(null);
      loadPackages();
    } catch (error) {
      console.error(`Error saving ${title}:`, error);
      alert(`Error saving ${title}. Check console for details.`);
    }
  };

  const handleDelete = async (pkgId) => {
    if (window.confirm("Are you sure? This action cannot be undone.")) {
      try {
        await entity.delete(pkgId);
        loadPackages();
      } catch (error) {
        console.error(`Error deleting ${title}:`, error);
        alert(`Error deleting ${title}. It might be referenced by other records.`);
      }
    }
  };

  const openForm = (pkg = null) => {
    setSelectedPackage(pkg);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedPackage(null);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex justify-end p-4">
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) closeForm(); else setIsFormOpen(true);}}>
              <DialogTrigger asChild>
                  <Button onClick={() => openForm()}><PlusCircle className="w-4 h-4 mr-2" />Add {title}</Button>
              </DialogTrigger>
              <DialogContent className={cn("p-0", formDialogMaxWidth)}>
                  <DialogHeader className="p-6 pb-0">
                      <DialogTitle>{selectedPackage ? `Edit ${title}` : `Add New ${title}`}</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6">
                    <FormComponent
                        pkg={selectedPackage}
                        onSave={handleSave}
                        onCancel={closeForm}
                    />
                  </div>
              </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => <TableHead key={col.accessorKey}>{col.header}</TableHead>)}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length + 1} className="text-center">Loading...</TableCell></TableRow>
            ) : packages.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="text-center">No {title}s found.</TableCell></TableRow>
            ) : (
              packages.map(pkg => (
                <TableRow key={pkg.id}>
                  {columns.map(col => (
                    <TableCell key={col.accessorKey}>
                      {col.cell ? col.cell({ row: { original: pkg } }) : pkg[col.accessorKey]}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openForm(pkg)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
