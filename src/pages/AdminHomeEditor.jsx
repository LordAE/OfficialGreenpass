
import React, { useState, useEffect } from 'react';
import { HomePageContent } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Save, Eye, Upload } from "lucide-react";
import { UploadFile } from '@/api/integrations';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import YouTubeEmbed from '../components/YouTubeEmbed';

export default function AdminHomeEditor() {
  const [content, setContent] = useState({
    singleton_key: "SINGLETON",
    hero_section: {
      title: "",
      subtitle: "",
      image_url: "",
      video_url: ""
    },
    features_section: [],
    testimonials_section: [],
    stats_section: [],
    schools_programs_section: { // New section initialization
      title: "",
      subtitle: "",
      show_featured_only: false,
      max_items: 6
    },
    final_cta_section: { // New section initialization
      title: "",
      subtitle: "",
      description: "",
      primary_button_text: "",
      primary_button_url: "",
      secondary_button_text: "",
      secondary_button_url: ""
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const existingContent = await HomePageContent.list();
        if (existingContent.length > 0) {
          const loadedContent = existingContent[0];
          
          // Sanitization Fix: Ensure defaults for all nested structures, especially new fields
          const sanitizedFeatures = (loadedContent.features_section || []).map(feature => ({
              icon: 'Star',
              title: '',
              description: '',
              image_url: '', // Ensure image_url is initialized
              youtube_url: '', // Ensure youtube_url is initialized
              link_url: '', // Ensure link_url is initialized
              link_text: '', // Ensure link_text is initialized
              media_position: 'left',
              show_rating: false,
              school_rating: 4.5, // Default for new features, matches addFeature
              ...feature // Spread existing feature data to override defaults
          }));

          setContent(prev => ({
            ...prev, // Start with the default structure to ensure new fields exist
            ...loadedContent, // Override with existing data
            // Ensure nested objects are also merged to prevent overwriting new empty nested objects
            hero_section: { ...prev.hero_section, ...(loadedContent.hero_section || {}) },
            schools_programs_section: { ...prev.schools_programs_section, ...(loadedContent.schools_programs_section || {}) },
            final_cta_section: { ...prev.final_cta_section, ...(loadedContent.final_cta_section || {}) },
            features_section: sanitizedFeatures, // Use sanitized features
            testimonials_section: loadedContent.testimonials_section || [], // Ensure array if not present
            stats_section: loadedContent.stats_section || [], // Ensure array if not present
          }));
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
      const existingContent = await HomePageContent.list();
      if (existingContent.length > 0) {
        await HomePageContent.update(existingContent[0].id, content);
      } else {
        await HomePageContent.create(content);
      }
      alert('Content saved successfully!');
    } catch (error) {
      console.error("Error saving content:", error);
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file, section, field, index = null) => {
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      if (section === 'hero') {
        setContent(prev => ({
          ...prev,
          hero_section: { ...prev.hero_section, [field]: file_url }
        }));
      } else if (section === 'feature' && index !== null) {
        setContent(prev => ({
          ...prev,
          features_section: prev.features_section.map((feature, i) =>
            i === index ? { ...feature, [field]: file_url } : feature
          )
        }));
      } else if (section === 'testimonial' && index !== null) {
        setContent(prev => ({
          ...prev,
          testimonials_section: prev.testimonials_section.map((testimonial, i) =>
            i === index ? { ...testimonial, [field]: file_url } : testimonial
          )
        }));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  // Generic update function for top-level sections
  const updateField = (sectionKey, field, value) => {
    setContent(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [field]: value }
    }));
  };

  const addFeature = () => {
    setContent(prev => ({
      ...prev,
      features_section: [
        ...(prev.features_section || []), // Ensure prev.features_section is an array
        {
          icon: 'Star', // Default icon for new feature
          title: '',
          description: '',
          image_url: '',
          youtube_url: '',
          link_url: '',
          link_text: '',
          media_position: 'left',
          show_rating: false, // New field for conditional rating display
          school_rating: 4.5 // Default rating for new features, matches sanitization
        }
      ]
    }));
  };

  const updateFeature = (index, field, value) => {
    setContent(prev => ({
      ...prev,
      features_section: prev.features_section.map((feature, i) =>
        i === index ? { ...feature, [field]: value } : feature
      )
    }));
  };

  const removeFeature = (index) => {
    setContent(prev => ({
      ...prev,
      features_section: prev.features_section.filter((_, i) => i !== index)
    }));
  };

  const addTestimonial = () => {
    setContent(prev => ({
      ...prev,
      testimonials_section: [
        ...prev.testimonials_section,
        {
          author_name: '',
          author_title: '',
          author_image_url: '',
          quote: '',
          video_url: ''
        }
      ]
    }));
  };

  const updateTestimonial = (index, field, value) => {
    setContent(prev => ({
      ...prev,
      testimonials_section: prev.testimonials_section.map((testimonial, i) =>
        i === index ? { ...testimonial, [field]: value } : testimonial
      )
    }));
  };

  const removeTestimonial = (index) => {
    setContent(prev => ({
      ...prev,
      testimonials_section: prev.testimonials_section.filter((_, i) => i !== index)
    }));
  };

  const addStat = () => {
    setContent(prev => ({
      ...prev,
      stats_section: [...prev.stats_section, { value: '', label: '' }]
    }));
  };

  const updateStat = (index, field, value) => {
    setContent(prev => ({
      ...prev,
      stats_section: prev.stats_section.map((stat, i) =>
        i === index ? { ...stat, [field]: value } : stat
      )
    }));
  };

  const removeStat = (index) => {
    setContent(prev => ({
      ...prev,
      stats_section: prev.stats_section.filter((_, i) => i !== index)
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
          <h1 className="text-3xl font-bold">Home Page Editor</h1>
          <div className="flex gap-2">
            <Link to={createPageUrl('Home')}>
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
                value={content.hero_section?.title || ''}
                onChange={(e) => updateField('hero_section', 'title', e.target.value)}
                placeholder="Study Abroad with Confidence"
              />
            </div>
            <div>
              <Label htmlFor="hero_subtitle">Subtitle</Label>
              <Textarea
                id="hero_subtitle"
                value={content.hero_section?.subtitle || ''}
                onChange={(e) => updateField('hero_section', 'subtitle', e.target.value)}
                placeholder="Your comprehensive super app for studying abroad..."
                rows={3}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hero_image">Hero Image</Label>
                <Input
                  id="hero_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0], 'hero', 'image_url')}
                  disabled={uploading}
                />
                {content.hero_section?.image_url && (
                  <img
                    src={content.hero_section.image_url}
                    alt="Hero"
                    className="mt-2 w-32 h-20 object-cover rounded"
                  />
                )}
              </div>
              <div>
                <Label htmlFor="hero_video_url">YouTube Video URL</Label>
                <Input
                  id="hero_video_url"
                  value={content.hero_section?.video_url || ''}
                  onChange={(e) => updateField('hero_section', 'video_url', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {content.hero_section?.video_url && (
                  <div className="mt-2">
                    <YouTubeEmbed
                      url={content.hero_section.video_url}
                      className="w-full h-32 rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Features Section
              <Button onClick={addFeature} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Feature
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(content.features_section || []).map((feature, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Feature {index + 1}</h4>
                  <Button variant="destructive" size="sm" onClick={() => removeFeature(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={feature.title}
                      onChange={(e) => updateFeature(index, 'title', e.target.value)}
                      placeholder="Feature title"
                    />
                  </div>
                   <div>
                    <Label>Icon/Display Type</Label>
                    <Select 
                      value={feature.show_rating ? 'rating' : feature.icon}
                      onValueChange={(value) => {
                        if (value === 'rating') {
                          updateFeature(index, 'show_rating', true);
                          // The icon field is not strictly needed for display when show_rating is true
                          // but can be kept for data consistency if desired.
                          // updateFeature(index, 'icon', 'GraduationCap'); // Removed as per outline, icon state is preserved or implicitly 'Star' if new
                        } else {
                          updateFeature(index, 'show_rating', false);
                          updateFeature(index, 'icon', value);
                        }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">⭐ Show Rating</SelectItem>
                        <SelectItem value="Star">Star</SelectItem>
                        <SelectItem value="Users">Users</SelectItem>
                        <SelectItem value="BookOpen">Book Open</SelectItem>
                        <SelectItem value="Globe">Globe</SelectItem>
                        <SelectItem value="CheckCircle">Check Circle</SelectItem>
                        <SelectItem value="School">School</SelectItem>
                        <SelectItem value="GraduationCap">GraduationCap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {feature.show_rating && ( // Conditionally render rating input
                  <div>
                    <Label>School Rating (1.0 - 5.0)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={feature.school_rating} // Now directly use feature.school_rating, default set in state and loadContent
                      onChange={(e) => updateFeature(index, 'school_rating', parseFloat(e.target.value))}
                      placeholder="4.5"
                    />
                  </div>
                )}
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={feature.description}
                    onChange={(e) => updateFeature(index, 'description', e.target.value)}
                    placeholder="Feature description"
                    rows={3}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Image</Label>
                    <div className="flex items-center gap-2">
                       <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0], 'feature', 'image_url', index)}
                        disabled={uploading}
                        className="flex-grow"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin"/>}
                    </div>
                    {feature.image_url && <img src={feature.image_url} alt="" className="mt-2 w-24 h-16 object-cover rounded"/>}
                  </div>
                  <div>
                    <Label>YouTube URL</Label>
                    <Input
                      value={feature.youtube_url || ''}
                      onChange={(e) => updateFeature(index, 'youtube_url', e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Link URL</Label>
                    <Input
                      value={feature.link_url || ''}
                      onChange={(e) => updateFeature(index, 'link_url', e.target.value)}
                      placeholder="/programs"
                    />
                  </div>
                  <div>
                    <Label>Link Text</Label>
                    <Input
                      value={feature.link_text || ''}
                      onChange={(e) => updateFeature(index, 'link_text', e.target.value)}
                      placeholder="Learn More"
                    />
                  </div>
                </div>
                 <div>
                  <Label>Media Position</Label>
                  <Select value={feature.media_position || 'left'} onValueChange={(value) => updateFeature(index, 'media_position', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Testimonials Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Testimonials Section
              <Button onClick={addTestimonial} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Testimonial
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.testimonials_section?.map((testimonial, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Testimonial {index + 1}</h4>
                  <Button variant="destructive" size="sm" onClick={() => removeTestimonial(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Author Name</Label>
                    <Input
                      value={testimonial.author_name}
                      onChange={(e) => updateTestimonial(index, 'author_name', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label>Author Title</Label>
                    <Input
                      value={testimonial.author_title}
                      onChange={(e) => updateTestimonial(index, 'author_title', e.target.value)}
                      placeholder="University of Toronto Student"
                    />
                  </div>
                </div>
                <div>
                  <Label>Author Image</Label>
                   <div className="flex items-center gap-2">
                     <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0], 'testimonial', 'author_image_url', index)}
                      disabled={uploading}
                      className="flex-grow"
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin"/>}
                  </div>
                  {testimonial.author_image_url && (
                    <img
                        src={testimonial.author_image_url}
                        alt="Author"
                        className="mt-2 w-24 h-24 object-cover rounded-full"
                    />
                  )}
                </div>
                <div>
                  <Label>Quote</Label>
                  <Textarea
                    value={testimonial.quote}
                    onChange={(e) => updateTestimonial(index, 'quote', e.target.value)}
                    placeholder="GreenPass made my dream come true..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Video URL (Optional)</Label>
                  <Input
                    value={testimonial.video_url || ''}
                    onChange={(e) => updateTestimonial(index, 'video_url', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  {testimonial.video_url && (
                    <div className="mt-2">
                      <YouTubeEmbed
                        url={testimonial.video_url}
                        className="w-full h-32 rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Stats Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Statistics Section
              <Button onClick={addStat} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Stat
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.stats_section?.map((stat, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Statistic {index + 1}</h4>
                  <Button variant="destructive" size="sm" onClick={() => removeStat(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Value</Label>
                    <Input
                      value={stat.value}
                      onChange={(e) => updateStat(index, 'value', e.target.value)}
                      placeholder="10,000+"
                    />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={stat.label}
                      onChange={(e) => updateStat(index, 'label', e.target.value)}
                      placeholder="Students Helped"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Schools & Programs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended Schools & Programs Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="schools_title">Section Title</Label>
              <Input
                id="schools_title"
                value={content.schools_programs_section?.title || ''}
                onChange={(e) => updateField('schools_programs_section', 'title', e.target.value)}
                placeholder="Recommended Schools"
              />
            </div>
            <div>
              <Label htmlFor="schools_subtitle">Section Subtitle</Label>
              <Textarea
                id="schools_subtitle"
                value={content.schools_programs_section?.subtitle || ''}
                onChange={(e) => updateField('schools_programs_section', 'subtitle', e.target.value)}
                placeholder="Discover our personally recommended educational institutions selected for their excellence and student success rates"
                rows={3}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Show Featured Only</Label>
                <Select
                  value={content.schools_programs_section?.show_featured_only ? 'true' : 'false'}
                  onValueChange={(value) => updateField('schools_programs_section', 'show_featured_only', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Recommended Schools Only</SelectItem>
                    <SelectItem value="false">All Schools</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Maximum Items to Show</Label>
                <Input
                  type="number"
                  value={content.schools_programs_section?.max_items || 6}
                  onChange={(e) => updateField('schools_programs_section', 'max_items', parseInt(e.target.value))}
                  min="3"
                  max="12"
                />
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Section Configuration</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div>• Title and subtitle are fully customizable</div>
                <div>• Schools now display ratings instead of star icons</div>
                <div>• "Recommended" badge appears on all displayed schools</div>
                <div>• Rating system shows 1-5 stars with decimal precision</div>
                <div>• Featured/Recommended schools can be filtered separately</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Final CTA Section */}
        <Card>
          <CardHeader>
            <CardTitle>Final Call-to-Action Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cta_title">Title</Label>
              <Input
                id="cta_title"
                value={content.final_cta_section?.title || ''}
                onChange={(e) => updateField('final_cta_section', 'title', e.target.value)}
                placeholder="Ready to start your journey?"
              />
            </div>
            <div>
              <Label htmlFor="cta_subtitle">Subtitle</Label>
              <Input
                id="cta_subtitle"
                value={content.final_cta_section?.subtitle || ''}
                onChange={(e) => updateField('final_cta_section', 'subtitle', e.target.value)}
                placeholder="Join thousands of successful students"
              />
            </div>
            <div>
              <Label htmlFor="cta_description">Description</Label>
              <Textarea
                id="cta_description"
                value={content.final_cta_section?.description || ''}
                onChange={(e) => updateField('final_cta_section', 'description', e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Primary Button Text</Label>
                <Input
                  value={content.final_cta_section?.primary_button_text || ''}
                  onChange={(e) => updateField('final_cta_section', 'primary_button_text', e.target.value)}
                />
              </div>
              <div>
                <Label>Primary Button URL</Label>
                <Input
                  value={content.final_cta_section?.primary_button_url || ''}
                  onChange={(e) => updateField('final_cta_section', 'primary_button_url', e.target.value)}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Secondary Button Text</Label>
                <Input
                  value={content.final_cta_section?.secondary_button_text || ''}
                  onChange={(e) => updateField('final_cta_section', 'secondary_button_text', e.target.value)}
                />
              </div>
              <div>
                <Label>Secondary Button URL</Label>
                <Input
                  value={content.final_cta_section?.secondary_button_url || ''}
                  onChange={(e) => updateField('final_cta_section', 'secondary_button_url', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
