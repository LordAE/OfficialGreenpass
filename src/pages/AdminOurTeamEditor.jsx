import React, { useState, useEffect } from 'react';
import { OurTeamPageContent } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Upload, Edit, Trash2, Plus, Users, ArrowUp, ArrowDown } from "lucide-react";

const TeamMemberCard = ({ member, index, totalMembers, onEdit, onDelete, onMoveUp, onMoveDown }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="h-6 w-6 p-0"
            >
              <ArrowUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMoveDown(index)}
              disabled={index === totalMembers - 1}
              className="h-6 w-6 p-0"
            >
              <ArrowDown className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold truncate">{member.name}</h3>
              <Badge variant="outline" className="text-xs">
                {member.category}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">{member.title}</p>
            <p className="text-xs text-gray-500 line-clamp-2">{member.bio}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {member.image_url && (
              <img 
                src={member.image_url} 
                alt={member.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
              />
            )}
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(member)}
                className="h-8 px-2"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(member.id)}
                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TeamMemberForm = ({ member, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    member || {
      id: `member_${Date.now()}`,
      name: '',
      title: '',
      bio: '',
      image_url: '',
      category: 'Team Member',
      sort_order: 99
    }
  );
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleInputChange('image_url', file_url);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="title">Job Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Founder">Founder</SelectItem>
            <SelectItem value="Leadership">Leadership</SelectItem>
            <SelectItem value="Team Member">Team Member</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => handleInputChange('bio', e.target.value)}
          rows={4}
          placeholder="Brief biography..."
        />
      </div>

      <div>
        <Label>Profile Photo</Label>
        <div className="flex items-center gap-4 mt-2">
          <input 
            type="file" 
            id="photo-upload" 
            accept="image/*" 
            onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])} 
            className="hidden" 
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => document.getElementById('photo-upload').click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload Photo
          </Button>
          {formData.image_url && (
            <img 
              src={formData.image_url} 
              alt="Preview" 
              className="w-16 h-16 rounded-full object-cover border"
            />
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {member ? 'Update Member' : 'Add Member'}
        </Button>
      </div>
    </form>
  );
};

export default function AdminOurTeamEditor() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const teamContent = await OurTeamPageContent.list();
      if (teamContent.length > 0) {
        setContent(teamContent[0]);
      } else {
        const defaultContent = {
          singleton_key: 'SINGLETON',
          hero_title: 'Meet Our Team',
          hero_subtitle: 'The passionate professionals driving our mission forward',
          hero_image_url: '',
          contact_email: 'team@greenpassgroup.com',
          team_members: []
        };
        const created = await OurTeamPageContent.create(defaultContent);
        setContent(created);
      }
    } catch (error) {
      console.error("Error loading Our Team content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const handleHeroImageUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleInputChange('hero_image_url', file_url);
    } catch (error) {
      console.error("Error uploading hero image:", error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMember = (memberData) => {
    const updatedMembers = [...(content.team_members || [])];
    const existingIndex = updatedMembers.findIndex(m => m.id === memberData.id);
    
    if (existingIndex >= 0) {
      updatedMembers[existingIndex] = memberData;
    } else {
      updatedMembers.push(memberData);
    }
    
    handleInputChange('team_members', updatedMembers);
    setEditingMember(null);
    setIsFormOpen(false);
  };

  const handleDeleteMember = (memberId) => {
    if (confirm('Are you sure you want to delete this team member?')) {
      const updatedMembers = (content.team_members || []).filter(m => m.id !== memberId);
      handleInputChange('team_members', updatedMembers);
    }
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updatedMembers = [...(content.team_members || [])];
    [updatedMembers[index - 1], updatedMembers[index]] = [updatedMembers[index], updatedMembers[index - 1]];
    handleInputChange('team_members', updatedMembers);
  };

  const handleMoveDown = (index) => {
    const members = content.team_members || [];
    if (index === members.length - 1) return;
    const updatedMembers = [...members];
    [updatedMembers[index], updatedMembers[index + 1]] = [updatedMembers[index + 1], updatedMembers[index]];
    handleInputChange('team_members', updatedMembers);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await OurTeamPageContent.update(content.id, content);
      alert('Our Team page updated successfully!');
    } catch (error) {
      console.error("Error saving Our Team content:", error);
      alert('Failed to save content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openMemberForm = (member = null) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="w-8 h-8" />
              Our Team Editor
            </h1>
            <p className="text-gray-600 mt-2">Manage your team page content and members</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="hero_title">Page Title</Label>
                <Input
                  id="hero_title"
                  value={content?.hero_title || ''}
                  onChange={(e) => handleInputChange('hero_title', e.target.value)}
                  placeholder="Meet Our Team"
                />
              </div>
              
              <div>
                <Label htmlFor="hero_subtitle">Page Subtitle</Label>
                <Textarea
                  id="hero_subtitle"
                  value={content?.hero_subtitle || ''}
                  onChange={(e) => handleInputChange('hero_subtitle', e.target.value)}
                  placeholder="The passionate professionals driving our mission forward"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={content?.contact_email || ''}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  placeholder="team@greenpassgroup.com"
                />
              </div>

              <div>
                <Label>Hero Background Image</Label>
                <div className="flex items-center gap-4 mt-2">
                  <input 
                    type="file" 
                    id="hero-upload" 
                    accept="image/*" 
                    onChange={(e) => e.target.files[0] && handleHeroImageUpload(e.target.files[0])} 
                    className="hidden" 
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => document.getElementById('hero-upload').click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Image
                  </Button>
                  {content?.hero_image_url && (
                    <img 
                      src={content.hero_image_url} 
                      alt="Hero preview" 
                      className="w-24 h-16 rounded object-cover border"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Use arrow buttons to reorder members
                  </p>
                </div>
                <Button onClick={() => openMemberForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {content?.team_members && content.team_members.length > 0 ? (
                <div className="space-y-4">
                  {content.team_members.map((member, index) => (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      index={index}
                      totalMembers={content.team_members.length}
                      onEdit={openMemberForm}
                      onDelete={handleDeleteMember}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No team members added yet.</p>
                  <Button className="mt-4" onClick={() => openMemberForm()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Member
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? 'Edit Team Member' : 'Add Team Member'}
              </DialogTitle>
            </DialogHeader>
            <TeamMemberForm
              member={editingMember}
              onSave={handleSaveMember}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}