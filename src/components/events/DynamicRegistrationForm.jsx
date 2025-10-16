// src/components/events/DynamicRegistrationForm.jsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CountrySelector from '@/components/CountrySelector';
import { Loader2 } from 'lucide-react';
import { EventRegistration } from '@/api/entities';
import { serverTimestamp } from 'firebase/firestore';

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

  /* ---------------------------
     Prefill from currentUser
  ---------------------------- */
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

  /* ---------------------------
     Minimal client validation
  ---------------------------- */
  const validate = () => {
    if (!formData.contact_name?.trim()) return 'Please enter your name.';
    if (!formData.contact_email?.trim()) return 'Please enter your email.';
    // very light email shape check
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.contact_email)) return 'Please enter a valid email.';
    if (!formData.guest_country?.trim()) return 'Please select your country.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) { setError(v); return; }

    setLoading(true);

    try {
      const priceUsd = Number((selectedTier && selectedTier.price_usd) || 0);
      const rate = Number(fxRate || 1);
      const amountUsd = Number(priceUsd.toFixed(2));
      const amountCad = Number((priceUsd * rate).toFixed(2));

      // Generate a readable unique reservation code
      const shortEvent = String(event?.event_id || event?.id || 'EVT').slice(-4).padStart(4, '0');
      const rand = Math.floor(100000 + Math.random() * 900000); // 6 digits
      const reservationCode = `EVT-${shortEvent}-${rand}`;

      // ⚠️ IMPORTANT: Write ONLY the fields your Firestore rules allow.
      // (No arbitrary extra fields; rules use .hasOnly([...]))
      const base = {
        event_id: String(event?.event_id ?? event?.id ?? ''),
        role: String((selectedTier && selectedTier.key) || 'attendee'),
        contact_name: formData.contact_name || '',
        contact_email: formData.contact_email || '',
        phone: formData.phone || '',
        organization_name: formData.organization_name || '',
        guest_country: formData.guest_country || 'Canada',
        amount_usd: amountUsd,
        amount_cad: amountCad,
        fx_rate: rate,
        is_guest_registration: !currentUser,
        reservation_code: reservationCode,
        created_at: serverTimestamp(), // ✅ required by your rules (created_at == request.time)
      };

      // Only include user_id if signed in (rules require it to equal auth.uid)
      const payload = (currentUser && currentUser.uid)
        ? { ...base, user_id: currentUser.uid }
        : base;

      const newRegistration = await EventRegistration.create(payload);

      if (typeof onRegistrationComplete === 'function') {
        onRegistrationComplete(newRegistration);
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setError(`Registration failed: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------
     Dynamic field renderer
     (UI-only; we DO NOT write
     unknown fields to Firestore)
  ---------------------------- */
  const renderField = (field) => {
    const key = field.field_key;
    const commonProps = {
      id: key,
      value: formData[key] ?? '',
      onChange: (e) => handleChange(key, e.target.value),
      placeholder: field.placeholder,
      required: !!field.required,
    };

    switch (field.field_type) {
      case 'text':
      case 'email':
        return <Input {...commonProps} type={field.field_type} />;
      case 'phone':
        return <Input {...commonProps} type="tel" />;
      case 'textarea':
        return <Textarea {...commonProps} />;
      case 'select':
        return (
          <Select
            onValueChange={(value) => handleChange(key, value)}
            value={String(formData[key] ?? '')}
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
            onCountryChange={(value) => handleChange(key, value)}
            defaultCountry={formData[key] || 'Canada'}
          />
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(event?.registration_form_fields || []).map((field) => (
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
