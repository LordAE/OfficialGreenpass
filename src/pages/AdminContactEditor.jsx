import React, { useState, useEffect } from 'react';
import { ContactPageContent } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Info, Phone } from "lucide-react";

export default function AdminContactEditor() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const data = await ContactPageContent.list();
      if (data.length > 0) {
        setContent(data[0]);
      } else {
        // Create a default entry if none exists
        const newContent = await ContactPageContent.create({});
        setContent(newContent);
      }
    } catch (error) {
      console.error("Error loading contact page content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!content) return;
    setSaving(true);
    try {
      await ContactPageContent.update(content.id, content);
      alert('Contact page content saved successfully!');
    } catch (error) {
      console.error("Error saving content:", error);
      alert('Failed to save content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Phone /> Contact Page Editor
        </h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Header Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hero_title">Main Title</Label>
              <Input id="hero_title" value={content.hero_title || ''} onChange={(e) => handleInputChange('hero_title', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="hero_subtitle">Subtitle</Label>
              <Textarea id="hero_subtitle" value={content.hero_subtitle || ''} onChange={(e) => handleInputChange('hero_subtitle', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Page Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="form_title">Contact Form Title</Label>
              <Input id="form_title" value={content.form_title || ''} onChange={(e) => handleInputChange('form_title', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="info_title">Contact Info Title</Label>
              <Input id="info_title" value={content.info_title || ''} onChange={(e) => handleInputChange('info_title', e.target.value)} />
            </div>
             <div>
              <Label htmlFor="office_hours_title">Office Hours Title</Label>
              <Input id="office_hours_title" value={content.office_hours_title || ''} onChange={(e) => handleInputChange('office_hours_title', e.target.value)} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={content.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={content.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={content.address || ''} onChange={(e) => handleInputChange('address', e.target.value)} placeholder="Supports multiline text" />
            </div>
            <div>
              <Label htmlFor="office_hours_vietnam">Office Hours (Vietnam)</Label>
              <Input id="office_hours_vietnam" value={content.office_hours_vietnam || ''} onChange={(e) => handleInputChange('office_hours_vietnam', e.target.value)} />
               <p className="text-xs text-gray-500 mt-1">HTML is supported for bolding, e.g., <strong>&lt;strong&gt;Vietnam Office:&lt;/strong&gt;</strong></p>
            </div>
             <div>
              <Label htmlFor="office_hours_canada">Office Hours (Canada)</Label>
              <Input id="office_hours_canada" value={content.office_hours_canada || ''} onChange={(e) => handleInputChange('office_hours_canada', e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}