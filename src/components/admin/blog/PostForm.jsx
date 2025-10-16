import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadFile } from '@/api/integrations';
import { Loader2, Image as ImageIcon, X as XIcon } from 'lucide-react';

const MAX_GALLERY = 20;

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    ['link', 'image'],
    ['clean'],
  ],
};

export default function PostForm({ post, onSave, onCancel }) {
  const [formData, setFormData] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const [content, setContent] = useState('');
  const [galleryImages, setGalleryImages] = useState([]);

  useEffect(() => {
    const initialData = post || {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      coverImageUrl: '',
      videoUrl: '',
      category: 'Immigration',
      author: '',
      readTime: '',
      isFeatured: false,

      // NEW highlight fields (defaults)
      isHighlight: false,
      highlight_duration_days: 7,
      highlight_until: null,
    };

    // hydrate editor + form
    setFormData(initialData);
    setContent(initialData.content || '');

    // Accept a few possible existing field names for gallery
    const incomingGallery =
      post?.galleryImageUrls || post?.gallery || post?.images || [];
    setGalleryImages(Array.isArray(incomingGallery) ? incomingGallery.slice(0, MAX_GALLERY) : []);
  }, [post]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData((prev) => ({ ...prev, coverImageUrl: file_url }));
    } catch (error) {
      console.error('Error uploading cover image:', error);
      alert('Failed to upload image.');
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  // ===== Gallery handlers =====
  const handleGalleryFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = MAX_GALLERY - galleryImages.length;
    if (remainingSlots <= 0) {
      alert(`You already have the maximum of ${MAX_GALLERY} images.`);
      e.target.value = null;
      return;
    }

    const toUpload = files.slice(0, remainingSlots);

    setIsGalleryUploading(true);
    try {
      const uploadedUrls = await Promise.all(
        toUpload.map(async (file) => {
          const { file_url } = await UploadFile({ file });
          return file_url;
        })
      );
      setGalleryImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      console.error('Error uploading gallery images:', err);
      alert('One or more gallery images failed to upload.');
    } finally {
      setIsGalleryUploading(false);
      e.target.value = null;
    }
  };

  const removeGalleryImage = (index) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Compute highlight_until if needed (store ISO string for portability)
    let highlight_until = null;
    const days = Number(formData.highlight_duration_days || 0);
    if (formData.isHighlight && days > 0) {
      const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      highlight_until = until.toISOString();
    }

    onSave({
      ...formData,
      content,
      // normalized highlight fields in payload
      isHighlight: Boolean(formData.isHighlight),
      highlight_duration_days: formData.isHighlight ? Math.max(1, Number(days)) : null,
      highlight_until: formData.isHighlight ? highlight_until : null,

      // NEW: gallery images array
      galleryImageUrls: galleryImages.slice(0, MAX_GALLERY),
    });
  };

  const generateSlug = () => {
    if (formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const onHighlightDaysChange = (e) => {
    const v = e.target.value;
    const n = Math.max(1, Number(v || 1));
    setFormData((prev) => ({ ...prev, highlight_duration_days: n }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" value={formData.title || ''} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="slug">URL Slug</Label>
          <div className="flex gap-2">
            <Input id="slug" name="slug" value={formData.slug || ''} onChange={handleChange} required />
            <Button type="button" variant="outline" onClick={generateSlug}>
              Generate
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          name="excerpt"
          value={formData.excerpt || ''}
          onChange={handleChange}
          rows={3}
          required
        />
      </div>

      <div>
        <Label>Content</Label>
        <ReactQuill theme="snow" value={content} onChange={setContent} modules={quillModules} className="bg-white" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12">
        <div>
          <Label htmlFor="coverImage">Cover Image</Label>
          <div className="flex items-center gap-4 mt-2">
            {formData.coverImageUrl ? (
              <img src={formData.coverImageUrl} alt="Cover" className="w-24 h-16 object-cover rounded-md" />
            ) : (
              <div className="w-24 h-16 bg-gray-100 rounded-md flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <Input id="coverImage" type="file" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
            {isUploading && <Loader2 className="w-5 h-5 animate-spin" />}
          </div>
        </div>

        <div>
          <Label htmlFor="videoUrl">Video URL (Optional)</Label>
          <Input
            id="videoUrl"
            name="videoUrl"
            value={formData.videoUrl || ''}
            onChange={handleChange}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
      </div>

      {/* ===== NEW: Gallery Images ===== */}
      <div className="pt-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="galleryImages">Gallery Images (up to {MAX_GALLERY})</Label>
          <span className="text-sm text-gray-500">
            {galleryImages.length}/{MAX_GALLERY}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-4">
          <Input
            id="galleryImages"
            type="file"
            accept="image/*"
            multiple
            onChange={handleGalleryFilesChange}
            disabled={isGalleryUploading || galleryImages.length >= MAX_GALLERY}
          />
          {isGalleryUploading && <Loader2 className="w-5 h-5 animate-spin" />}
        </div>

        {galleryImages.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {galleryImages.map((url, idx) => (
              <div key={`${url}-${idx}`} className="relative group">
                <img
                  src={url}
                  alt={`Gallery ${idx + 1}`}
                  className="w-full h-28 object-cover rounded-md border"
                />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(idx)}
                  className="absolute top-1 right-1 bg-white/90 hover:bg-white text-red-600 rounded-full p-1 shadow transition"
                  aria-label="Remove image"
                  title="Remove image"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">
            No gallery images yet. You can select multiple files at once. Remaining slots:{' '}
            {MAX_GALLERY - galleryImages.length}.
          </p>
        )}
      </div>

      {/* NEW: Highlight controls */}
      <div className="border-t pt-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isHighlight"
            checked={Boolean(formData.isHighlight)}
            onChange={handleChange}
            className="h-4 w-4"
          />
          <span className="font-medium">Highlight this post</span>
        </label>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="highlight_duration_days">Highlight Duration (days)</Label>
            <Input
              id="highlight_duration_days"
              type="number"
              min={1}
              step={1}
              value={formData.highlight_duration_days ?? 7}
              onChange={onHighlightDaysChange}
              disabled={!formData.isHighlight}
            />
            <p className="text-xs text-gray-500 mt-1">
              When enabled, the post will be highlighted for the specified number of days from the time you save it.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isUploading || isGalleryUploading}>
          {isUploading || isGalleryUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            'Save Post'
          )}
        </Button>
      </div>
    </form>
  );
}
