import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CountrySelector from '@/components/CountrySelector';
import { Loader2 } from 'lucide-react';
import { EventRegistration } from '@/api/entities';

const DynamicRegistrationForm = ({ event, selectedTier, currentUser, onRegistrationComplete, fxRate }) => {
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_email: '',
    phone: '',
    organization_name: '',
    guest_country: 'Canada',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const priceUsd = Number((selectedTier && selectedTier.price_usd) || 0);
      const rate = Number(fxRate || 1);

      // Base/common fields
      const base = {
        event_id: String(event.event_id),
        role: String((selectedTier && selectedTier.key) || 'attendee'),
        contact_name: formData.contact_name || '',
        contact_email: formData.contact_email || '',
        phone: formData.phone || '',
        organization_name: formData.organization_name || '',
        guest_country: formData.guest_country || 'Canada',
        amount_usd: priceUsd,
        amount_cad: priceUsd * rate,
        fx_rate: rate,
        is_guest_registration: !currentUser,
        reservation_code: `EVT-${String(event.event_id).slice(-4)}-${Math.floor(100000 + Math.random() * 900000)}`,
        ...formData, // allow dynamic custom fields
      };

      // ✅ only add user_id when actually signed in (Firebase exposes uid)
      const registrationData = (currentUser && currentUser.uid)
        ? { ...base, user_id: currentUser.uid }
        : base;

      // extra safety: drop undefined values
      const clean = Object.fromEntries(Object.entries(registrationData).filter(([, v]) => v !== undefined));

      const newRegistration = await EventRegistration.create(clean);
      if (typeof onRegistrationComplete === 'function') onRegistrationComplete(newRegistration);
    } catch (err) {
      console.error('Registration failed:', err);
      setError(`Registration failed: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const commonProps = {
      id: field.field_key,
      value: formData[field.field_key] || '',
      onChange: (e) => handleChange(field.field_key, e.target.value),
      placeholder: field.placeholder,
      required: !!field.required,
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
          <Select
            onValueChange={(value) => handleChange(field.field_key, value)}
            value={String(formData[field.field_key] || '')}
          >
            <SelectTrigger><SelectValue placeholder={field.placeholder} /></SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'country':
        return (
          <CountrySelector
            onCountryChange={(value) => handleChange(field.field_key, value)}
            defaultCountry={formData[field.field_key] || 'Canada'}
          />
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(event.registration_form_fields || []).map((field) => (
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
