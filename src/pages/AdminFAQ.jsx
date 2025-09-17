// src/pages/AdminFAQ.jsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2, Save, Eye } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/* ---------- Firebase ---------- */
import { db } from '@/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

/* ---------- Helpers ---------- */
const pickFirst = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && (`${v}`.trim?.() ?? `${v}`) !== '') ?? undefined;

const ensureNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toCSV = (arr) => (Array.isArray(arr) ? arr.join(', ') : (arr || ''));
const fromCSV = (s) => (s || '').split(',').map(x => x.trim()).filter(Boolean);

const mapFAQDoc = (snap) => {
  const d = { id: snap.id, ...snap.data() };
  return {
    id: snap.id,
    faq_id: pickFirst(d.faq_id, d.slug, snap.id),
    lang: (d.lang || 'en').toLowerCase(),
    title: d.title || '',
    body: d.body || '',
    category: d.category || 'general',
    tags: Array.isArray(d.tags) ? d.tags : fromCSV(d.tags),
    priority: ensureNumber(d.priority, 0),
    ...d,
  };
};

export default function AdminFAQ() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState(null);
  const [formData, setFormData] = useState({
    faq_id: '',
    lang: 'en',
    title: '',
    body: '',
    category: 'general',
    tags: '',
    priority: 0
  });

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'faqs'));
      const items = snap.docs.map(mapFAQDoc);
      // Sort by priority DESC (to match '-priority')
      items.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      setFaqs(items);
    } catch (error) {
      console.error("Error loading FAQs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        faq_id: formData.faq_id || `faq_${Date.now()}`,
        lang: (formData.lang || 'en').toLowerCase(),
        title: formData.title || '',
        body: formData.body || '',
        category: formData.category || 'general',
        tags: fromCSV(formData.tags),
        priority: ensureNumber(formData.priority, 0),
        updatedAt: serverTimestamp(),
      };

      if (selectedFAQ?.id) {
        await updateDoc(doc(db, 'faqs', selectedFAQ.id), payload);
      } else {
        await addDoc(collection(db, 'faqs'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      setIsFormOpen(false);
      resetForm();
      await loadFAQs();
    } catch (error) {
      console.error("Error saving FAQ:", error);
      alert('Failed to save FAQ');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      await deleteDoc(doc(db, 'faqs', docId));
      await loadFAQs();
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      alert('Failed to delete FAQ');
    }
  };

  const openForm = (faq = null) => {
    if (faq) {
      setSelectedFAQ(faq);
      setFormData({
        faq_id: faq.faq_id || '',
        lang: (faq.lang || 'en').toLowerCase(),
        title: faq.title || '',
        body: faq.body || '',
        category: faq.category || 'general',
        tags: toCSV(faq.tags),
        priority: faq.priority ?? 0
      });
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setSelectedFAQ(null);
    setFormData({
      faq_id: '',
      lang: 'en',
      title: '',
      body: '',
      category: 'general',
      tags: '',
      priority: 0
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">FAQ Management</h1>
          <div className="flex gap-2">
            <Link to={createPageUrl('FAQ')}>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </Link>
            <Dialog
              open={isFormOpen}
              onOpenChange={(open) => {
                if (!open) resetForm();
                setIsFormOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => openForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add FAQ
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{selectedFAQ ? 'Edit FAQ' : 'Add New FAQ'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="faq_id">FAQ ID</Label>
                      <Input
                        id="faq_id"
                        value={formData.faq_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, faq_id: e.target.value }))}
                        placeholder="faq_001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lang">Language</Label>
                      <Select
                        value={formData.lang}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, lang: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="vi">Vietnamese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="title">Question</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="How do I apply to a school?"
                    />
                  </div>

                  <div>
                    <Label htmlFor="body">Answer</Label>
                    <Textarea
                      id="body"
                      value={formData.body}
                      onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                      placeholder="To apply to a school..."
                      rows={5}
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="reservations">Reservations</SelectItem>
                          <SelectItem value="payments">Payments</SelectItem>
                          <SelectItem value="visa">Visa</SelectItem>
                          <SelectItem value="tutors">Tutors</SelectItem>
                          <SelectItem value="marketplace">Marketplace</SelectItem>
                          <SelectItem value="schools">Schools</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Input
                        id="priority"
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="application, visa, payment"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Save FAQ
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faqs.map((faq) => (
                    <TableRow key={faq.id}>
                      <TableCell className="font-medium">{faq.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{faq.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{(faq.lang || 'en').toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{faq.priority ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openForm(faq)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(faq.id)}
                            className="text-red-500"
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
