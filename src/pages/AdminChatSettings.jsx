import React, { useState, useEffect } from 'react';
import { ChatSettings } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, Save, Loader2, Phone, MessageCircle } from 'lucide-react';

export default function AdminChatSettings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const settingsData = await ChatSettings.list();
            if (settingsData.length > 0) {
                setSettings(settingsData[0]);
            } else {
                // Create initial settings if they don't exist
                const newSettings = await ChatSettings.create({ singleton_key: 'SINGLETON', whatsapp_number: '', zalo_number: '' });
                setSettings(newSettings);
            }
        } catch (error) {
            console.error("Error loading chat settings:", error);
        }
        setLoading(false);
    };

    const handleInputChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await ChatSettings.update(settings.id, {
                whatsapp_number: settings.whatsapp_number,
                zalo_number: settings.zalo_number
            });
            alert('Chat settings saved successfully!');
        } catch (error) {
            console.error("Error saving chat settings:", error);
            alert('Failed to save settings. Please try again.');
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <MessageSquare className="w-8 h-8 text-gray-700" />
                    <h1 className="text-3xl font-bold text-gray-800">Chat Channel Settings</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Configure Support Channels</CardTitle>
                        <CardDescription>
                            Enter your business phone numbers for WhatsApp and Zalo. These will be displayed to users on the public website.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="whatsapp_number" className="flex items-center gap-2">
                                <Phone className="w-5 h-5 text-green-600" />
                                WhatsApp Number
                            </Label>
                            <Input
                                id="whatsapp_number"
                                value={settings?.whatsapp_number || ''}
                                onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
                                placeholder="e.g., 14155552671 (include country code)"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="zalo_number" className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-blue-600" />
                                Zalo Number
                            </Label>
                            <Input
                                id="zalo_number"
                                value={settings?.zalo_number || ''}
                                onChange={(e) => handleInputChange('zalo_number', e.target.value)}
                                placeholder="e.g., 84123456789 (include country code)"
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                {saving ? 'Saving...' : 'Save Settings'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}