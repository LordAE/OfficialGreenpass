// src/components/events/DynamicRegistrationForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CountrySelector from '@/components/CountrySelector';
import { Loader2 } from 'lucide-react';

// ⬇️ Firestore (write-only)
import { serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase'; // keep same path you use elsewhere

/* =========================
   Required fields & helpers
========================= */
const REQUIRED_FIELDS = [
  { field_key: 'contact_name',  label: 'Full Name', field_type: 'text',  required: true, placeholder: 'John Doe' },
  { field_key: 'contact_email', label: 'Email',     field_type: 'email', required: true, placeholder: 'name@example.com' },
];

const ALLOWED_PAYLOAD_KEYS = new Set([
  'event_id','role','contact_name','contact_email',
  'amount_usd','amount_cad','fx_rate',
  'is_guest_registration','reservation_code','created_at',
  'user_id','extra', 'is_verified',
  'status','payment_method','payment_date',
]);

const ensureRequired = (fields = []) => {
  const have = new Set(fields.map((f) => f.field_key));
  const need = REQUIRED_FIELDS.filter((r) => !have.has(r.field_key));
  return [...need, ...fields];
};

const normalizeField = (f) => ({
  field_key: f.field_key,
  label: f.label ?? '',
  field_type: f.field_type ?? 'text',
  required: !!f.required,
  placeholder: f.placeholder ?? '',
  options: Array.isArray(f.options) ? f.options : undefined,
});

const DynamicRegistrationForm = ({
  event,
  selectedTier,
  currentUser,
  onRegistrationComplete,
  fxRate,
}) => {
  const formFields = useMemo(() => {
    const incoming = Array.isArray(event?.registration_form_fields)
      ? event.registration_form_fields
      : [];
    return ensureRequired(incoming).map(normalizeField);
  }, [event?.registration_form_fields]);

  const [formData, setFormData] = useState({
    contact_name: '',
    contact_email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        contact_name: currentUser.full_name || prev.contact_name || '',
        contact_email: currentUser.email || prev.contact_email || '',
        phone: currentUser.phone || prev.phone || '',
        organization_name: prev.organization_name || '',
        guest_country: currentUser.country || prev.guest_country || '',
      }));
    } else {
      setFormData({
        contact_name: '',
        contact_email: '',
        phone: '',
        organization_name: '',
        guest_country: '',
      });
    }
  }, [currentUser]);

  const handleChange = (field, value) => setFormData((p) => ({ ...p, [field]: value }));

  const validate = () => {
    if (!formData.contact_name?.trim()) return 'Please enter your name.';
    if (!formData.contact_email?.trim()) return 'Please enter your email.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.contact_email)) return 'Please enter a valid email.';
    for (const f of formFields) {
      if (f.required) {
        const v = formData[f.field_key];
        if (v === undefined || v === null || String(v).trim() === '') {
          return `Please fill out: ${f.label || f.field_key}.`;
        }
      }
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) { setError(v); return; }

    setLoading(true);
    try {
      const priceUsd = Number(selectedTier?.price_usd || 0);
      const rate = Number(fxRate || 1);
      const isFree = priceUsd <= 0;

      const amountUsd = isFree ? 0 : Number(priceUsd.toFixed(2));
      const amountCad = isFree ? 0 : Number((priceUsd * rate).toFixed(2));

      const eventIdStr = String(event?.event_id ?? event?.id ?? '');
      const shortEvent = eventIdStr.slice(-4).padStart(4, '0');
      const rand = Math.floor(100000 + Math.random() * 900000);
      const reservationCode = `EVT-${shortEvent || '0000'}-${rand}`;

      const base = {
        event_id: eventIdStr,
        role: String(selectedTier?.role ?? selectedTier?.key ?? selectedTier?.id ?? 'attendee'),
        contact_name: formData.contact_name || '',
        contact_email: formData.contact_email || '',
        amount_usd: amountUsd,
        amount_cad: amountCad,
        fx_rate: rate,
        is_guest_registration: !currentUser,
        is_verified: false,
        reservation_code: reservationCode,
        created_at: serverTimestamp(),
        ...(currentUser?.uid || currentUser?.id ? { user_id: currentUser.uid || currentUser.id } : {}),
        ...(isFree
          ? { status: 'paid', payment_method: 'free', payment_date: new Date().toISOString() }
          : { status: 'created' }),
      };

      const extra = {};
      for (const f of formFields) {
        const k = f.field_key;
        if (!ALLOWED_PAYLOAD_KEYS.has(k)) {
          const val = formData[k];
          if (val !== undefined && val !== null && String(val).trim() !== '') extra[k] = val;
        }
      }
      if (Object.keys(extra).length) base.extra = extra;

      const payload = Object.fromEntries(Object.entries(base).filter(([k]) => ALLOWED_PAYLOAD_KEYS.has(k)));

      const docRef = await addDoc(collection(db, 'event_registrations'), payload);

      if (typeof onRegistrationComplete === 'function') {
        // ⬇️ Return full payload so caller can skip any follow-up updates
        onRegistrationComplete({ id: docRef.id, ...payload });
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setError(`Registration failed: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const key = field.field_key;
    const commonProps = {
      id: key,
      value: String(formData[key] ?? ''),
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
          <Select value={String(formData[key] ?? '')} onValueChange={(v) => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder={field.placeholder} /></SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={String(opt)} value={String(opt)}>{String(opt)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'country':
        return (
          <CountrySelector
            onCountryChange={(v) => handleChange(key, v)}
            defaultCountry={formData[key] || 'Canada'}
          />
        );
      default:
        return <Input {...commonProps} type="text" />;
    }
  };

  const priceUsd = Number(selectedTier?.price_usd || 0);
  const submitLabel = priceUsd > 0 ? 'Proceed to Payment' : 'Complete Registration';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formFields.map((field) => (
        <div key={field.field_key} className="space-y-1">
          <Label htmlFor={field.field_key}>{field.label}</Label>
          {renderField(field)}
        </div>
      ))}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : submitLabel}
      </Button>
    </form>
  );
};

export default DynamicRegistrationForm;
