import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CountrySelector from '@/components/CountrySelector';
import { Loader2 } from 'lucide-react';
import { EventRegistration } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/URLRedirect';

const DynamicRegistrationForm = ({ event, selectedTier, currentUser, onRegistrationComplete, fxRate }) => {
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            setFormData(prev => ({
                ...prev,
                contact_name: currentUser.full_name || '',
                contact_email: currentUser.email || '',
                phone: currentUser.phone || '',
                organization_name: '',
                guest_country: currentUser.country || 'Canada',
            }));
        } else {
            setFormData({
                contact_name: '',
                contact_email: '',
                phone: '',
                organization_name: '',
                guest_country: 'Canada',
            });
        }
    }, [currentUser]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const registrationData = {
                event_id: event.event_id,
                role: selectedTier.key,
                contact_name: formData.contact_name,
                contact_email: formData.contact_email,
                phone: formData.phone,
                organization_name: formData.organization_name,
                guest_country: formData.guest_country,
                amount_usd: selectedTier.price_usd,
                amount_cad: selectedTier.price_usd * fxRate,
                fx_rate: fxRate,
                is_guest_registration: !currentUser,
                reservation_code: `EVT-${event.event_id.slice(-4)}-${Math.floor(100000 + Math.random() * 900000)}`,
                user_id: currentUser?.id, // Use the existing user ID if available
                ...formData
            };
            
            const newRegistration = await EventRegistration.create(registrationData);
            
            onRegistrationComplete(newRegistration);

        } catch (err) {
            console.error("Registration failed:", err);
            setError(`Registration failed: ${err.message}`);
            setLoading(false);
        }
    };

    const renderField = (field) => {
        const commonProps = {
            id: field.field_key,
            value: formData[field.field_key] || '',
            onChange: (e) => handleChange(field.field_key, e.target.value),
            placeholder: field.placeholder,
            required: field.required,
        };

        switch (field.field_type) {
            case 'text':
            case 'email':
            case 'phone':
                return <Input {...commonProps} type={field.field_type} />;
            case 'textarea':
                return <Textarea {...commonProps} />;
            case 'select':
                return (
                    <Select onValueChange={(value) => handleChange(field.field_key, value)} value={formData[field.field_key]}>
                        <SelectTrigger><SelectValue placeholder={field.placeholder} /></SelectTrigger>
                        <SelectContent>
                            {field.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                );
            case 'country':
                return <CountrySelector onCountryChange={(value) => handleChange(field.field_key, value)} defaultCountry={formData[field.field_key] || 'Canada'} />;
            default:
                return null;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {event.registration_form_fields?.map(field => (
                <div key={field.field_key}>
                    <Label htmlFor={field.field_key}>{field.label}</Label>
                    {renderField(field)}
                </div>
            ))}
            
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Proceed to Payment'}
            </Button>
        </form>
    );
};

export default DynamicRegistrationForm;