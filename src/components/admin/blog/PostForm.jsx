import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadFile } from '@/api/integrations';
import { Loader2, Image as ImageIcon } from 'lucide-react';

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link', 'image'],
    ['clean']
  ],
};

export default function PostForm({ post, onSave, onCancel }) {
  const [formData, setFormData] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [content, setContent] = useState('');

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
      isFeatured: false
    };
    setFormData(initialData);
    setContent(initialData.content);
  }, [post]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, coverImageUrl: file_url }));
    } catch (error) {
      console.error("Error uploading cover image:", error);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, content });
  };

  const generateSlug = () => {
    if (formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div><Label htmlFor="title">Title</Label><Input id="title" name="title" value={formData.title} onChange={handleChange} required /></div>
        <div><Label htmlFor="slug">URL Slug</Label>
          <div className="flex gap-2"><Input id="slug" name="slug" value={formData.slug} onChange={handleChange} required /><Button type="button" variant="outline" onClick={generateSlug}>Generate</Button></div>
        </div>
      </div>
      <div><Label htmlFor="excerpt">Excerpt</Label><Textarea id="excerpt" name="excerpt" value={formData.excerpt} onChange={handleChange} rows={3} required /></div>
      <div><Label>Content</Label><ReactQuill theme="snow" value={content} onChange={setContent} modules={quillModules} className="bg-white"/></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12">
        <div>
          <Label htmlFor="coverImage">Cover Image</Label>
          <div className="flex items-center gap-4 mt-2">
            {formData.coverImageUrl ? <img src={formData.coverImageUrl} alt="Cover" className="w-24 h-16 object-cover rounded-md"/> : <div className="w-24 h-16 bg-gray-100 rounded-md flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-400"/></div>}
            <Input id="coverImage" type="file" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
            {isUploading && <Loader2 className="w-5 h-5 animate-spin" />}
          </div>
        </div>
        <div><Label htmlFor="videoUrl">Video URL (Optional)</Label><Input id="videoUrl" name="videoUrl" value={formData.videoUrl} onChange={handleChange} placeholder="https://www.youtube.com/watch?v=..." /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div><Label htmlFor="category">Category</Label>
          <Select name="category" value={formData.category} onValueChange={(v) => handleSelectChange('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Programs">Programs</SelectItem>
              <SelectItem value="Agents">Agents</SelectItem>
              <SelectItem value="Schools">Schools</SelectItem>
              <SelectItem value="Immigration">Immigration</SelectItem>
              <SelectItem value="Events">Events</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="author">Author</Label><Input id="author" name="author" value={formData.author} onChange={handleChange} required /></div>
        <div><Label htmlFor="readTime">Read Time</Label><Input id="readTime" name="readTime" value={formData.readTime} onChange={handleChange} placeholder="e.g., 5 min read" required /></div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Post</Button>
      </div>
    </form>
  );
}