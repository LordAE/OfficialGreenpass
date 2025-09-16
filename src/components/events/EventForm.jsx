import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Upload, Plus } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import YouTubeEmbed from '../YouTubeEmbed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RegistrationFormBuilder from './RegistrationFormBuilder';

const timezones = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Toronto', label: 'Toronto (ET)' },
    { value: 'America/Vancouver', label: 'Vancouver (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Ho_Chi_Minh', label: 'Vietnam (ICT)' },
    { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
];

export default function EventForm({ event, onSave, onCancel }) {
    const [formData, setFormData] = useState({});
    const [tiers, setTiers] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [videoMode, setVideoMode] = useState('none');

    useEffect(() => {
        const initialTiers = event?.registration_tiers?.map(t => ({...t, benefits: t.benefits?.join('\n') || ''})) || [];
        setTiers(initialTiers);
        
        setFormData(event ? {
            ...event,
            start: event.start ? event.start.substring(0, 16) : '',
            end: event.end ? event.end.substring(0, 16) : '',
            archive_at: event.archive_at ? event.archive_at.substring(0, 16) : '',
            introduction: event.introduction || '',
            fair_inclusions: event.fair_inclusions?.join('\n') || '',
            additional_activities: event.additional_activities?.join('\n') || '',
            target_audience: event.promotion_plan?.target_audience || '',
            Promotion_Channels: event.promotion_plan?.Promotion_Channels || '',
            social_media: event.promotion_plan?.social_media || '',
            email_marketing: event.promotion_plan?.email_marketing || '',
            paid_ads: event.promotion_plan?.paid_ads || '',
            offline_marketing: event.promotion_plan?.offline_marketing || '',
            shipping_deadline: event.shipping_deadline ? event.shipping_deadline.substring(0, 10) : '',
            shipping_address: event.shipping_address || '',
            exhibitor_notes: event.exhibitor_notes || '',
            phone: event.contact_details?.phone || '',
            email: event.contact_details?.email || '',
            cover_image: event.cover_image || null,
            gallery_images: event.gallery_images || [],
            promo_video: event.promo_video || null,
            promo_video_url: event.promo_video_url || '',
            media_attribution: event.media_attribution || '',
            registration_form_fields: event.registration_form_fields || [],
            sort_order: event.sort_order || 999,
            highlight_tag: event.highlight_tag || '',
        } : {
            title: '',
            location: '',
            start: '',
            end: '',
            timezone: 'America/Los_Angeles',
            event_id: `evt_${Date.now()}`,
            archive_at: '',
            introduction: '',
            fair_inclusions: '',
            additional_activities: '',
            target_audience: '',
            Promotion_Channels: '',
            social_media: '',
            email_marketing: '',
            paid_ads: '',
            offline_marketing: '',
            shipping_deadline: '',
            shipping_address: '',
            exhibitor_notes: '',
            phone: '',
            email: '',
            cover_image: null,
            gallery_images: [],
            promo_video: null,
            promo_video_url: '',
            media_attribution: '',
            registration_form_fields: [],
            sort_order: 999,
            highlight_tag: '',
        });

        if (event?.promo_video || event?.promo_video_url) {
            setVideoMode(event.promo_video ? 'upload' : 'youtube');
        }
    }, [event]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTierChange = (index, field, value) => {
        const newTiers = [...tiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setTiers(newTiers);
    };

    const addTier = () => {
        setTiers([...tiers, {
            key: `tier_${Date.now()}`,
            name: '',
            description: '',
            price_usd: 0,
            benefits: ''
        }]);
    };

    const removeTier = (index) => {
        setTiers(tiers.filter((_, i) => i !== index));
    };

    const handleImageUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await UploadFile({ file });
            if (type === 'cover') {
                setFormData(prev => ({ ...prev, cover_image: result.file_url }));
            } else if (type === 'gallery') {
                setFormData(prev => ({ 
                    ...prev, 
                    gallery_images: [...(prev.gallery_images || []), result.file_url] 
                }));
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
        }
        setUploading(false);
    };

    const handleVideoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await UploadFile({ file });
            setFormData(prev => ({ ...prev, promo_video: result.file_url }));
        } catch (error) {
            console.error('Video upload error:', error);
            alert('Failed to upload video');
        }
        setUploading(false);
    };

    const removeGalleryImage = (indexToRemove) => {
        setFormData(prev => ({
            ...prev,
            gallery_images: prev.gallery_images.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleSubmit = () => {
        const processedTiers = tiers.map(t => ({
            ...t,
            benefits: t.benefits.split('\n').filter(b => b.trim())
        }));

        const dataToSave = {
            ...formData,
            sort_order: Number(formData.sort_order) || 999,
            registration_tiers: processedTiers,
            start: new Date(formData.start).toISOString(),
            end: new Date(formData.end).toISOString(),
            archive_at: formData.archive_at ? new Date(formData.archive_at).toISOString() : null,
            shipping_deadline: formData.shipping_deadline ? formData.shipping_deadline : null,
            fair_inclusions: formData.fair_inclusions.split('\n').filter(s => s.trim()),
            additional_activities: formData.additional_activities.split('\n').filter(s => s.trim()),
            promotion_plan: {
                target_audience: formData.target_audience,
                Promotion_Channels: formData.Promotion_Channels,
                social_media: formData.social_media,
                email_marketing: formData.email_marketing,
                paid_ads: formData.paid_ads,
                offline_marketing: formData.offline_marketing,
            },
            contact_details: {
                phone: formData.phone,
                email: formData.email,
            },
            registration_form_fields: formData.registration_form_fields
        };

        // Remove flattened properties from top level
        delete dataToSave.target_audience;
        delete dataToSave.Promotion_Channels;
        delete dataToSave.social_media;
        delete dataToSave.email_marketing;
        delete dataToSave.paid_ads;
        delete dataToSave.offline_marketing;
        delete dataToSave.phone;
        delete dataToSave.email;

        onSave(dataToSave);
    };

    return (
        <form className="space-y-6 max-h-[80vh] overflow-y-auto p-2">
            
            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Core Details</h3>
                <div>
                    <Label htmlFor="title">Event Title</Label>
                    <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" name="location" value={formData.location} onChange={handleChange} required />
                    </div>
                     <div>
                        <Label htmlFor="highlight_tag">Highlight Tag</Label>
                        <Input id="highlight_tag" name="highlight_tag" value={formData.highlight_tag || ''} onChange={handleChange} placeholder="e.g., Most Popular"/>
                    </div>
                </div>
                <div>
                    <Label htmlFor="sort_order">Display Priority (Lower numbers show first)</Label>
                    <Input id="sort_order" name="sort_order" type="number" value={formData.sort_order || ''} onChange={handleChange} />
                    <p className="text-xs text-gray-500 mt-1">Enter 1 for highest priority, 2 for second, etc. Default is 999.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <Label htmlFor="start">Start Date & Time</Label>
                        <Input id="start" name="start" type="datetime-local" value={formData.start} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label htmlFor="end">End Date & Time</Label>
                        <Input id="end" name="end" type="datetime-local" value={formData.end} onChange={handleChange} required />
                    </div>
                </div>
                 <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select name="timezone" value={formData.timezone} onValueChange={(value) => handleSelectChange('timezone', value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                            {timezones.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor="archive_at">Archive Date (hide event after this date)</Label>
                    <Input id="archive_at" name="archive_at" type="datetime-local" value={formData.archive_at} onChange={handleChange} />
                </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Registration Tiers</h3>
                <div className="space-y-4">
                    {tiers.map((tier, index) => (
                        <div key={tier.key || index} className="p-4 border rounded-md relative space-y-3 bg-gray-50">
                            <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeTier(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Tier Name</Label>
                                    <Input value={tier.name} onChange={(e) => handleTierChange(index, 'name', e.target.value)} placeholder="e.g., Gold Sponsor" required />
                                </div>
                                <div>
                                    <Label>Price (USD)</Label>
                                    <Input type="number" value={tier.price_usd} onChange={(e) => handleTierChange(index, 'price_usd', parseFloat(e.target.value))} placeholder="500" required />
                                </div>
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea value={tier.description} onChange={(e) => handleTierChange(index, 'description', e.target.value)} placeholder="What this tier includes..." />
                            </div>
                            <div>
                                <Label>Benefits (one per line)</Label>
                                <Textarea value={tier.benefits} onChange={(e) => handleTierChange(index, 'benefits', e.target.value)} placeholder="Premium booth location&#10;Marketing materials included&#10;VIP networking access" rows={4} />
                            </div>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" onClick={addTier} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Registration Tier
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registration Form Fields</CardTitle>
                </CardHeader>
                <CardContent>
                    <RegistrationFormBuilder
                        fields={formData.registration_form_fields || []}
                        onChange={(fields) => setFormData(prev => ({ ...prev, registration_form_fields: fields }))}
                    />
                </CardContent>
            </Card>

            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Content & Media</h3>
                
                <div>
                    <Label htmlFor="introduction">Introduction</Label>
                    <Textarea id="introduction" name="introduction" value={formData.introduction} onChange={handleChange} rows={4} />
                </div>

                <div>
                    <Label htmlFor="cover_image">Cover Image</Label>
                    <div className="mt-2">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'cover')}
                            className="hidden"
                            id="cover-upload"
                            disabled={uploading}
                        />
                        <label htmlFor="cover-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Upload Cover Image'}
                        </label>
                    </div>
                    {formData.cover_image && (
                        <div className="mt-2">
                            <img src={formData.cover_image} alt="Cover" className="w-32 h-20 object-cover rounded" />
                        </div>
                    )}
                </div>

                <div>
                    <Label htmlFor="gallery_images">Gallery Images</Label>
                    <div className="mt-2">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'gallery')}
                            className="hidden"
                            id="gallery-upload"
                            disabled={uploading}
                        />
                        <label htmlFor="gallery-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Add Gallery Image'}
                        </label>
                    </div>
                    {formData.gallery_images && formData.gallery_images.length > 0 && (
                        <div className="mt-2 grid grid-cols-4 gap-2">
                            {formData.gallery_images.map((img, index) => (
                                <div key={index} className="relative">
                                    <img src={img} alt={`Gallery ${index + 1}`} className="w-full h-20 object-cover rounded" />
                                    <Button type="button" size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeGalleryImage(index)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <Label>Promotional Video</Label>
                    <div className="flex gap-2 mb-3">
                        <Button type="button" variant={videoMode === 'none' ? 'default' : 'outline'} onClick={() => setVideoMode('none')}>None</Button>
                        <Button type="button" variant={videoMode === 'upload' ? 'default' : 'outline'} onClick={() => setVideoMode('upload')}>Upload Video</Button>
                        <Button type="button" variant={videoMode === 'youtube' ? 'default' : 'outline'} onClick={() => setVideoMode('youtube')}>YouTube Link</Button>
                    </div>

                    {videoMode === 'upload' && (
                        <div>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={handleVideoUpload}
                                className="hidden"
                                id="video-upload"
                                disabled={uploading}
                            />
                            <label htmlFor="video-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                                <Upload className="w-4 h-4" />
                                {uploading ? 'Uploading...' : 'Upload Video'}
                            </label>
                            {formData.promo_video && (
                                <div className="mt-2">
                                    <video src={formData.promo_video} controls className="w-64 h-36 rounded" />
                                </div>
                            )}
                        </div>
                    )}

                    {videoMode === 'youtube' && (
                        <div className="space-y-2">
                            <Input
                                placeholder="YouTube URL"
                                value={formData.promo_video_url}
                                onChange={(e) => setFormData(prev => ({ ...prev, promo_video_url: e.target.value }))}
                            />
                            {formData.promo_video_url && (
                                <div className="mt-2">
                                    <YouTubeEmbed url={formData.promo_video_url} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <Label htmlFor="media_attribution">Media Attribution</Label>
                    <Input id="media_attribution" name="media_attribution" value={formData.media_attribution} onChange={handleChange} placeholder="Photo credits, video source, etc." />
                </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Fair Details</h3>
                
                <div>
                    <Label htmlFor="fair_inclusions">Fair Inclusions (one per line)</Label>
                    <Textarea id="fair_inclusions" name="fair_inclusions" value={formData.fair_inclusions} onChange={handleChange} rows={4} />
                </div>
                
                <div>
                    <Label htmlFor="additional_activities">Additional Activities (one per line)</Label>
                    <Textarea id="additional_activities" name="additional_activities" value={formData.additional_activities} onChange={handleChange} rows={4} />
                </div>
                
                <div>
                    <Label htmlFor="shipping_deadline">Shipping Deadline</Label>
                    <Input id="shipping_deadline" name="shipping_deadline" type="date" value={formData.shipping_deadline} onChange={handleChange} />
                </div>
                
                <div>
                    <Label htmlFor="shipping_address">Shipping Address</Label>
                    <Textarea id="shipping_address" name="shipping_address" value={formData.shipping_address} onChange={handleChange} rows={3} />
                </div>
                
                <div>
                    <Label htmlFor="exhibitor_notes">Exhibitor Notes</Label>
                    <Textarea id="exhibitor_notes" name="exhibitor_notes" value={formData.exhibitor_notes} onChange={handleChange} rows={3} />
                </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Promotion Plan</h3>
                
                <div>
                    <Label htmlFor="target_audience">Target Audience</Label>
                    <Input id="target_audience" name="target_audience" value={formData.target_audience} onChange={handleChange} />
                </div>
                
                <div>
                    <Label htmlFor="Promotion_Channels">Promotion Channels</Label>
                    <Textarea id="Promotion_Channels" name="Promotion_Channels" value={formData.Promotion_Channels} onChange={handleChange} rows={3} />
                </div>
                
                <div>
                    <Label htmlFor="social_media">Social Media Strategy</Label>
                    <Textarea id="social_media" name="social_media" value={formData.social_media} onChange={handleChange} rows={3} />
                </div>
                
                <div>
                    <Label htmlFor="email_marketing">Email Marketing</Label>
                    <Textarea id="email_marketing" name="email_marketing" value={formData.email_marketing} onChange={handleChange} rows={3} />
                </div>
                
                <div>
                    <Label htmlFor="paid_ads">Paid Advertising</Label>
                    <Textarea id="paid_ads" name="paid_ads" value={formData.paid_ads} onChange={handleChange} rows={3} />
                </div>
                
                <div>
                    <Label htmlFor="offline_marketing">Offline Marketing</Label>
                    <Textarea id="offline_marketing" name="offline_marketing" value={formData.offline_marketing} onChange={handleChange} rows={3} />
                </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Contact Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="phone">Contact Phone</Label>
                        <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="email">Contact Email</Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                    </div>
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="button" onClick={handleSubmit}>Save Event</Button>
            </div>
        </form>
    );
}