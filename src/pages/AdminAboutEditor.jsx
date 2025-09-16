import React, { useState, useEffect } from 'react';
import { AboutPageContent } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Save, Eye } from "lucide-react";
import { UploadFile } from '@/api/integrations';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import YouTubeEmbed from '../components/YouTubeEmbed';

export default function AdminAboutEditor() {
  const [content, setContent] = useState({
    singleton_key: "SINGLETON",
    hero_title: "",
    hero_subtitle: "",
    hero_image_url: "",
    hero_video_url: "",
    mission_subtitle: "",
    mission_title: "",
    mission_text: "",
    values: [],
    team_title: "",
    team_text: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const existingContent = await AboutPageContent.list();
        if (existingContent.length > 0) {
          setContent(existingContent[0]);
        }
      } catch (error) {
        console.error("Error loading content:", error);
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const existingContent = await AboutPageContent.list();
      if (existingContent.length > 0) {
        await AboutPageContent.update(existingContent[0].id, content);
      } else {
        await AboutPageContent.create(content);
      }
      alert('Content saved successfully!');
    } catch (error) {
      console.error("Error saving content:", error);
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file, field) => {
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setContent(prev => ({ ...prev, [field]: file_url }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const updateField = (field, value) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const addValue = () => {
    setContent(prev => ({
      ...prev,
      values: [
        ...prev.values,
        { id: Date.now().toString(), icon: 'Star', title: '', text: '' }
      ]
    }));
  };

  const updateValue = (index, field, value) => {
    setContent(prev => ({
      ...prev,
      values: prev.values.map((val, i) =>
        i === index ? { ...val, [field]: value } : val
      )
    }));
  };

  const removeValue = (index) => {
    setContent(prev => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">About Page Editor</h1>
          <div className="flex gap-2">
            <Link to={createPageUrl('About')}>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <Card>
          <CardHeader>
            <CardTitle>Hero Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hero_title">Title</Label>
              <Input
                id="hero_title"
                value={content.hero_title || ''}
                onChange={(e) => updateField('hero_title', e.target.value)}
                placeholder="About GreenPass"
              />
            </div>
            <div>
              <Label htmlFor="hero_subtitle">Subtitle</Label>
              <Textarea
                id="hero_subtitle"
                value={content.hero_subtitle || ''}
                onChange={(e) => updateField('hero_subtitle', e.target.value)}
                placeholder="Empowering students to achieve their international education dreams"
                rows={2}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hero_image">Hero Image</Label>
                <Input
                  id="hero_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0], 'hero_image_url')}
                  disabled={uploading}
                />
                {content.hero_image_url && (
                  <img 
                    src={content.hero_image_url} 
                    alt="Hero" 
                    className="mt-2 w-32 h-20 object-cover rounded"
                  />
                )}
              </div>
              <div>
                <Label htmlFor="hero_video_url">YouTube Video URL</Label>
                <Input
                  id="hero_video_url"
                  value={content.hero_video_url || ''}
                  onChange={(e) => updateField('hero_video_url', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {content.hero_video_url && (
                  <div className="mt-2">
                    <YouTubeEmbed 
                      url={content.hero_video_url} 
                      className="w-full h-32 rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mission Section */}
        <Card>
          <CardHeader>
            <CardTitle>Mission Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mission_subtitle">Mission Subtitle</Label>
              <Input
                id="mission_subtitle"
                value={content.mission_subtitle || ''}
                onChange={(e) => updateField('mission_subtitle', e.target.value)}
                placeholder="Transforming International Education"
              />
            </div>
            <div>
              <Label htmlFor="mission_title">Mission Title</Label>
              <Input
                id="mission_title"
                value={content.mission_title || ''}
                onChange={(e) => updateField('mission_title', e.target.value)}
                placeholder="Our Mission"
              />
            </div>
            <div>
              <Label htmlFor="mission_text">Mission Text</Label>
              <Textarea
                id="mission_text"
                value={content.mission_text || ''}
                onChange={(e) => updateField('mission_text', e.target.value)}
                placeholder="We believe every student deserves access to quality international education..."
                rows={5}
              />
            </div>
          </CardContent>
        </Card>

        {/* Values Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Values Section
              <Button onClick={addValue} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Value
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.values?.map((value, index) => (
              <div key={value.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Value {index + 1}</h4>
                  <Button variant="destructive" size="sm" onClick={() => removeValue(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label>Icon</Label>
                    <Select value={value.icon} onValueChange={(value) => updateValue(index, 'icon', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Star">Star</SelectItem>
                        <SelectItem value="Users">Users</SelectItem>
                        <SelectItem value="CheckCircle">Check Circle</SelectItem>
                        <SelectItem value="Globe">Globe</SelectItem>
                        <SelectItem value="BookOpen">Book Open</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={value.title}
                      onChange={(e) => updateValue(index, 'title', e.target.value)}
                      placeholder="Excellence"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Description</Label>
                    <Textarea
                      value={value.text}
                      onChange={(e) => updateValue(index, 'text', e.target.value)}
                      placeholder="We maintain the highest standards..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Team Section */}
        <Card>
          <CardHeader>
            <CardTitle>Team Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="team_title">Team Title</Label>
              <Input
                id="team_title"
                value={content.team_title || ''}
                onChange={(e) => updateField('team_title', e.target.value)}
                placeholder="Our Team"
              />
            </div>
            <div>
              <Label htmlFor="team_text">Team Description</Label>
              <Textarea
                id="team_text"
                value={content.team_text || ''}
                onChange={(e) => updateField('team_text', e.target.value)}
                placeholder="GreenPass is built by a diverse team..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}