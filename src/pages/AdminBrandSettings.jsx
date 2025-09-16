import React, { useState, useEffect } from 'react';
import { BrandSettings } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Upload, Image, Palette, Info } from "lucide-react";

export default function AdminBrandSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const brandSettings = await BrandSettings.list();
      if (brandSettings.length > 0) {
        setSettings(brandSettings[0]);
      } else {
        // Create default settings
        const defaultSettings = {
          singleton_key: 'SINGLETON',
          company_name: 'GreenPass',
          logo_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/52125f446_GP2withnameTransparent.png',
          primary_color: '#059669',
          secondary_color: '#0f766e',
          tagline: 'Your comprehensive super app for studying abroad',
          footer_text: 'All rights reserved.'
        };
        const created = await BrandSettings.create(defaultSettings);
        setSettings(created);
      }
    } catch (error) {
      console.error("Error loading brand settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (field, file) => {
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, WebP, or SVG)');
      return;
    }

    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      const { file_url } = await UploadFile({ file });
      handleInputChange(field, file_url);
    } catch (error) {
      console.error(`Error uploading ${field}:`, error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await BrandSettings.update(settings.id, settings);
      alert('Brand settings saved successfully! Please refresh the page to see changes.');
    } catch (error) {
      console.error("Error saving brand settings:", error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Palette className="w-8 h-8" />
              Brand Settings
            </h1>
            <p className="text-gray-600 mt-2">Customize your company branding and appearance</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={settings?.company_name || ''}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>
              
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Textarea
                  id="tagline"
                  value={settings?.tagline || ''}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  placeholder="Your company tagline or description"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="footer_text">Footer Text</Label>
                <Input
                  id="footer_text"
                  value={settings?.footer_text || ''}
                  onChange={(e) => handleInputChange('footer_text', e.target.value)}
                  placeholder="Copyright text for footer"
                />
              </div>
            </CardContent>
          </Card>

          {/* Logo & Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Logos & Images
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Logo */}
              <div>
                <Label>Main Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {settings?.logo_url && (
                    <img 
                      src={settings.logo_url} 
                      alt="Current logo" 
                      className="h-12 w-auto object-contain bg-gray-100 p-2 rounded"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && handleFileUpload('logo_url', e.target.files[0])}
                      disabled={uploading.logo_url}
                    />
                    {uploading.logo_url && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: PNG or SVG format, transparent background
                    </p>
                  </div>
                </div>
              </div>

              {/* Dark Logo */}
              <div>
                <Label>Dark Version Logo (Optional)</Label>
                <div className="mt-2 flex items-center gap-4">
                  {settings?.logo_dark_url && (
                    <img 
                      src={settings.logo_dark_url} 
                      alt="Dark logo" 
                      className="h-12 w-auto object-contain bg-gray-800 p-2 rounded"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && handleFileUpload('logo_dark_url', e.target.files[0])}
                      disabled={uploading.logo_dark_url}
                    />
                    {uploading.logo_dark_url && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      For use on dark backgrounds
                    </p>
                  </div>
                </div>
              </div>

              {/* Favicon */}
              <div>
                <Label>Favicon</Label>
                <div className="mt-2 flex items-center gap-4">
                  {settings?.favicon_url && (
                    <img 
                      src={settings.favicon_url} 
                      alt="Favicon" 
                      className="h-8 w-8 object-contain bg-gray-100 p-1 rounded"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && handleFileUpload('favicon_url', e.target.files[0])}
                      disabled={uploading.favicon_url}
                    />
                    {uploading.favicon_url && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Square format recommended (32x32 or 64x64 pixels)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Brand Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      id="primary_color"
                      value={settings?.primary_color || '#059669'}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      className="w-16 h-10 p-1 rounded"
                    />
                    <Input
                      value={settings?.primary_color || '#059669'}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      placeholder="#059669"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      id="secondary_color"
                      value={settings?.secondary_color || '#0f766e'}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      className="w-16 h-10 p-1 rounded"
                    />
                    <Input
                      value={settings?.secondary_color || '#0f766e'}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      placeholder="#0f766e"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Note: Color changes will be applied after the next app update. Contact support for immediate color theme updates.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  {settings?.logo_url && (
                    <img 
                      src={settings.logo_url} 
                      alt={settings?.company_name || 'Company Logo'} 
                      className="h-10 w-auto object-contain"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{settings?.company_name || 'Company Name'}</h3>
                    <p className="text-gray-600 text-sm">{settings?.tagline || 'Company tagline'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div 
                    className="w-8 h-8 rounded" 
                    style={{ backgroundColor: settings?.primary_color || '#059669' }}
                  />
                  <div 
                    className="w-8 h-8 rounded" 
                    style={{ backgroundColor: settings?.secondary_color || '#0f766e' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}