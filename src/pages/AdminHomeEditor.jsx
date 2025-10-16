// src/pages/AdminHomeEditor.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Save, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import YouTubeEmbed from "../components/YouTubeEmbed";

/* ---------- Firebase ---------- */
import { db, storage } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/* ---------- Constants ---------- */
const DOC_PATH = { col: "home_page_contents", id: "SINGLETON" };

const DEFAULTS = {
  singleton_key: "SINGLETON",
  hero_section: { title: "", subtitle: "", image_url: "", video_url: "" },
  features_section: [],
  testimonials_section: [],
  stats_section: [],
  schools_programs_section: {
    title: "",
    subtitle: "",
    show_featured_only: false,
    max_items: 6,
  },
  final_cta_section: {
    title: "",
    subtitle: "",
    description: "",
    primary_button_text: "",
    primary_button_url: "",
    secondary_button_text: "",
    secondary_button_url: "",
  },
};

const DEFAULT_FEATURE = {
  icon: "Star",
  title: "",
  description: "",
  image_url: "",
  youtube_url: "",
  video_url: "", // NEW: mp4 (or any direct video URL)
  link_url: "",
  link_text: "",
  media_position: "left",
  show_rating: false,
  school_rating: 4.5,
};

const DEFAULT_TESTIMONIAL = {
  author_name: "",
  author_title: "",
  author_image_url: "",
  quote: "",
  video_url: "",
};

/* ---------- Page ---------- */
export default function AdminHomeEditor() {
  const [content, setContent] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Ensure loaded doc overlays defaults and arrays have correct shapes
  const sanitizeLoaded = (loaded = {}) => {
    const base = { ...DEFAULTS, ...loaded };

    const sanitizedFeatures = Array.isArray(base.features_section)
      ? base.features_section.map((f) => ({ ...DEFAULT_FEATURE, ...f }))
      : [];

    const sanitizedTestimonials = Array.isArray(base.testimonials_section)
      ? base.testimonials_section.map((t) => ({ ...DEFAULT_TESTIMONIAL, ...t }))
      : [];

    const sanitizedStats = Array.isArray(base.stats_section) ? base.stats_section : [];

    return {
      ...base,
      hero_section: { ...DEFAULTS.hero_section, ...(base.hero_section || {}) },
      features_section: sanitizedFeatures,
      testimonials_section: sanitizedTestimonials,
      stats_section: sanitizedStats,
      schools_programs_section: {
        ...DEFAULTS.schools_programs_section,
        ...(base.schools_programs_section || {}),
      },
      final_cta_section: { ...DEFAULTS.final_cta_section, ...(base.final_cta_section || {}) },
    };
  };

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, DOC_PATH.col, DOC_PATH.id));
        if (snap.exists()) {
          setContent(sanitizeLoaded(snap.data()));
        } else {
          setContent(DEFAULTS);
        }
      } catch (e) {
        console.error("Error loading content:", e);
        if (e?.code === "permission-denied") {
          alert("You don't have permission to view the Home page content. Ask an admin for access.");
        } else {
          alert("Failed to load Home page content.");
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, DOC_PATH.col, DOC_PATH.id),
        { ...content, singleton_key: "SINGLETON", updated_at: serverTimestamp() },
        { merge: true }
      );
      alert("Content saved successfully!");
    } catch (error) {
      console.error("Error saving content:", error);
      if (error?.code === "permission-denied") {
        alert("You don't have permission to save this content.");
      } else {
        alert("Failed to save content.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Upload to Firebase Storage and set the field (works for images or videos)
  const handleUploadToField = async (file, section, field, index = null) => {
    if (!file) return;
    setUploading(true);
    try {
      const cleanName = file.name.replace(/\s+/g, "-").toLowerCase();
      let path = `home/${section}/${Date.now()}-${cleanName}`;
      if ((section === "feature" || section === "testimonial") && index !== null) {
        // upload under /home/features/{i}/... or /home/testimonials/{i}/...
        path = `home/${section}s/${index}/${Date.now()}-${cleanName}`;
      }
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const file_url = await getDownloadURL(storageRef);

      if (section === "hero") {
        setContent((prev) => ({ ...prev, hero_section: { ...prev.hero_section, [field]: file_url } }));
      } else if (section === "feature" && index !== null) {
        setContent((prev) => ({
          ...prev,
          features_section: prev.features_section.map((feature, i) =>
            i === index ? { ...feature, [field]: file_url } : feature
          ),
        }));
      } else if (section === "testimonial" && index !== null) {
        setContent((prev) => ({
          ...prev,
          testimonials_section: prev.testimonials_section.map((t, i) =>
            i === index ? { ...t, [field]: file_url } : t
          ),
        }));
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  // Generic update function for nested sections
  const updateField = (sectionKey, field, value) => {
    setContent((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [field]: value } }));
  };

  // Features
  const addFeature = () => {
    setContent((prev) => ({
      ...prev,
      features_section: [...(prev.features_section || []), { ...DEFAULT_FEATURE }],
    }));
  };
  const updateFeature = (index, field, value) => {
    setContent((prev) => ({
      ...prev,
      features_section: prev.features_section.map((feature, i) =>
        i === index ? { ...feature, [field]: value } : feature
      ),
    }));
  };
  const removeFeature = (index) => {
    setContent((prev) => ({
      ...prev,
      features_section: prev.features_section.filter((_, i) => i !== index),
    }));
  };

  // Testimonials
  const addTestimonial = () => {
    setContent((prev) => ({
      ...prev,
      testimonials_section: [...prev.testimonials_section, { ...DEFAULT_TESTIMONIAL }],
    }));
  };
  const updateTestimonial = (index, field, value) => {
    setContent((prev) => ({
      ...prev,
      testimonials_section: prev.testimonials_section.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ),
    }));
  };
  const removeTestimonial = (index) => {
    setContent((prev) => ({
      ...prev,
      testimonials_section: prev.testimonials_section.filter((_, i) => i !== index),
    }));
  };

  // Stats
  const addStat = () => {
    setContent((prev) => ({ ...prev, stats_section: [...prev.stats_section, { value: "", label: "" }] }));
  };
  const updateStat = (index, field, value) => {
    setContent((prev) => ({
      ...prev,
      stats_section: prev.stats_section.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };
  const removeStat = (index) => {
    setContent((prev) => ({
      ...prev,
      stats_section: prev.stats_section.filter((_, i) => i !== index),
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
            <Link to={createPageUrl("Home")}>
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
                value={content.hero_section?.title || ""}
                onChange={(e) => updateField("hero_section", "title", e.target.value)}
                placeholder="Study Abroad with Confidence"
              />
            </div>
            <div>
              <Label htmlFor="hero_subtitle">Subtitle</Label>
              <Textarea
                id="hero_subtitle"
                value={content.hero_section?.subtitle || ""}
                onChange={(e) => updateField("hero_section", "subtitle", e.target.value)}
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
                  onChange={(e) => e.target.files?.[0] && handleUploadToField(e.target.files[0], "hero", "image_url")}
                  disabled={uploading}
                />
                {content.hero_section?.image_url && (
                  <img src={content.hero_section.image_url} alt="Hero" className="mt-2 w-32 h-20 object-cover rounded" />
                )}
              </div>
              <div>
                <Label htmlFor="hero_video_url">YouTube Video URL</Label>
                <Input
                  id="hero_video_url"
                  value={content.hero_section?.video_url || ""}
                  onChange={(e) => updateField("hero_section", "video_url", e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {content.hero_section?.video_url && (
                  <div className="mt-2">
                    <YouTubeEmbed url={content.hero_section.video_url} className="w-full h-32 rounded" />
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
                      onChange={(e) => updateFeature(index, "title", e.target.value)}
                      placeholder="Feature title"
                    />
                  </div>
                  <div>
                    <Label>Icon/Display Type</Label>
                    <Select
                      value={feature.show_rating ? "rating" : feature.icon || "Star"}
                      onValueChange={(value) => {
                        if (value === "rating") {
                          updateFeature(index, "show_rating", true);
                        } else {
                          updateFeature(index, "show_rating", false);
                          updateFeature(index, "icon", value);
                        }
                      }}
                    >
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

                {feature.show_rating && (
                  <div>
                    <Label>School Rating (1.0 - 5.0)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={feature.school_rating}
                      onChange={(e) => {
                        const val = Number.parseFloat(e.target.value);
                        updateFeature(index, "school_rating", Number.isFinite(val) ? val : 4.5);
                      }}
                      placeholder="4.5"
                    />
                  </div>
                )}

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={feature.description}
                    onChange={(e) => updateFeature(index, "description", e.target.value)}
                    placeholder="Feature description"
                    rows={3}
                  />
                </div>

                {/* Media inputs */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Image</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          e.target.files?.[0] && handleUploadToField(e.target.files[0], "feature", "image_url", index)
                        }
                        disabled={uploading}
                        className="flex-grow"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    {feature.image_url && (
                      <img src={feature.image_url} alt="" className="mt-2 w-24 h-16 object-cover rounded" />
                    )}
                  </div>

                  <div>
                    <Label>YouTube URL (optional)</Label>
                    <Input
                      value={feature.youtube_url || ""}
                      onChange={(e) => updateFeature(index, "youtube_url", e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                    {feature.youtube_url && (
                      <div className="mt-2">
                        <YouTubeEmbed url={feature.youtube_url} className="w-full h-32 rounded" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>MP4 Video (optional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={(e) =>
                          e.target.files?.[0] && handleUploadToField(e.target.files[0], "feature", "video_url", index)
                        }
                        disabled={uploading}
                        className="flex-grow"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    <Input
                      className="mt-2"
                      value={feature.video_url || ""}
                      onChange={(e) => updateFeature(index, "video_url", e.target.value)}
                      placeholder="https://.../your-video.mp4"
                    />
                    {feature.video_url && (
                      <video
                        className="mt-2 w-full h-32 rounded"
                        src={feature.video_url}
                        controls
                        playsInline
                        preload="metadata"
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      If both YouTube and MP4 are set, the homepage uses <b>YouTube</b> first.
                    </p>
                  </div>

                  <div>
                    <Label>Media Position</Label>
                    <Select
                      value={feature.media_position || "left"}
                      onValueChange={(value) => updateFeature(index, "media_position", value)}
                    >
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

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Link URL</Label>
                    <Input
                      value={feature.link_url || ""}
                      onChange={(e) => updateFeature(index, "link_url", e.target.value)}
                      placeholder="/programs"
                    />
                  </div>
                  <div>
                    <Label>Link Text</Label>
                    <Input
                      value={feature.link_text || ""}
                      onChange={(e) => updateFeature(index, "link_text", e.target.value)}
                      placeholder="Learn More"
                    />
                  </div>
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
                      onChange={(e) => updateTestimonial(index, "author_name", e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label>Author Title</Label>
                    <Input
                      value={testimonial.author_title}
                      onChange={(e) => updateTestimonial(index, "author_title", e.target.value)}
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
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleUploadToField(e.target.files[0], "testimonial", "author_image_url", index)
                      }
                      disabled={uploading}
                      className="flex-grow"
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
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
                    onChange={(e) => updateTestimonial(index, "quote", e.target.value)}
                    placeholder="GreenPass made my dream come true..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Video URL (Optional)</Label>
                  <Input
                    value={testimonial.video_url || ""}
                    onChange={(e) => updateTestimonial(index, "video_url", e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  {testimonial.video_url && (
                    <div className="mt-2">
                      <YouTubeEmbed url={testimonial.video_url} className="w-full h-32 rounded" />
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
                      onChange={(e) => updateStat(index, "value", e.target.value)}
                      placeholder="10,000+"
                    />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={stat.label}
                      onChange={(e) => updateStat(index, "label", e.target.value)}
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
                value={content.schools_programs_section?.title || ""}
                onChange={(e) => updateField("schools_programs_section", "title", e.target.value)}
                placeholder="Recommended Schools"
              />
            </div>
            <div>
              <Label htmlFor="schools_subtitle">Section Subtitle</Label>
              <Textarea
                id="schools_subtitle"
                value={content.schools_programs_section?.subtitle || ""}
                onChange={(e) => updateField("schools_programs_section", "subtitle", e.target.value)}
                placeholder="Discover our personally recommended educational institutions selected for their excellence and student success rates"
                rows={3}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Show Featured Only</Label>
                <Select
                  value={content.schools_programs_section?.show_featured_only ? "true" : "false"}
                  onValueChange={(value) =>
                    updateField("schools_programs_section", "show_featured_only", value === "true")
                  }
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
                  value={content.schools_programs_section?.max_items ?? 6}
                  onChange={(e) => {
                    const v = Number.parseInt(e.target.value, 10);
                    updateField(
                      "schools_programs_section",
                      "max_items",
                      Number.isFinite(v) ? v : 6
                    );
                  }}
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
                <div>• Rating system shows 1–5 stars with decimal precision</div>
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
                value={content.final_cta_section?.title || ""}
                onChange={(e) => updateField("final_cta_section", "title", e.target.value)}
                placeholder="Ready to start your journey?"
              />
            </div>
            <div>
              <Label htmlFor="cta_subtitle">Subtitle</Label>
              <Input
                id="cta_subtitle"
                value={content.final_cta_section?.subtitle || ""}
                onChange={(e) => updateField("final_cta_section", "subtitle", e.target.value)}
                placeholder="Join thousands of successful students"
              />
            </div>
            <div>
              <Label htmlFor="cta_description">Description</Label>
              <Textarea
                id="cta_description"
                value={content.final_cta_section?.description || ""}
                onChange={(e) => updateField("final_cta_section", "description", e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Primary Button Text</Label>
                <Input
                  value={content.final_cta_section?.primary_button_text || ""}
                  onChange={(e) => updateField("final_cta_section", "primary_button_text", e.target.value)}
                />
              </div>
              <div>
                <Label>Primary Button URL</Label>
                <Input
                  value={content.final_cta_section?.primary_button_url || ""}
                  onChange={(e) => updateField("final_cta_section", "primary_button_url", e.target.value)}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Secondary Button Text</Label>
                <Input
                  value={content.final_cta_section?.secondary_button_text || ""}
                  onChange={(e) =>
                    updateField("final_cta_section", "secondary_button_text", e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Secondary Button URL</Label>
                <Input
                  value={content.final_cta_section?.secondary_button_url || ""}
                  onChange={(e) =>
                    updateField("final_cta_section", "secondary_button_url", e.target.value)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
