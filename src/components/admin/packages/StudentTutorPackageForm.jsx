import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";

export default function StudentTutorPackageForm({ pkg, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    target_user: '',
    price_display: '',
    price_usd: 0,
    num_sessions: 0,
    key_benefits: [],
    icon: 'BookOpen',
  });

  useEffect(() => {
    if (pkg) {
      setFormData({
        ...pkg,
        key_benefits: Array.isArray(pkg.key_benefits) ? pkg.key_benefits : [],
      });
    } else {
      setFormData({
        name: '',
        target_user: '',
        price_display: '',
        price_usd: 0,
        num_sessions: 0,
        key_benefits: [],
        icon: 'BookOpen',
      });
    }
  }, [pkg]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleBenefitsChange = (e) => {
    setFormData(prev => ({ ...prev, key_benefits: e.target.value.split('\n') }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
        ...formData,
        price_usd: parseFloat(formData.price_usd),
        num_sessions: parseInt(formData.num_sessions),
        key_benefits: formData.key_benefits.filter(b => b.trim() !== '')
    };
    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
      <Input name="name" placeholder="Package Name" value={formData.name} onChange={handleChange} required />
      <Input name="icon" placeholder="Lucide Icon Name" value={formData.icon} onChange={handleChange} required />
      <Input name="target_user" placeholder="Target User (e.g. IELTS Student)" value={formData.target_user} onChange={handleChange} required />
      <div className="grid grid-cols-2 gap-4">
        <Input name="price_usd" placeholder="Price (USD)" type="number" value={formData.price_usd} onChange={handleChange} required />
        <Input name="price_display" placeholder="Display Price (e.g. $29/session)" value={formData.price_display} onChange={handleChange} required />
      </div>
      <Input name="num_sessions" placeholder="Number of Sessions" type="number" value={formData.num_sessions} onChange={handleChange} required />
      
      <Label htmlFor="key_benefits">Key Benefits (one per line)</Label>
      <Textarea id="key_benefits" name="key_benefits" placeholder="Benefit 1\nBenefit 2" value={formData.key_benefits?.join('\n')} onChange={handleBenefitsChange} rows={4} />

      <DialogFooter className="sticky bottom-0 bg-white pt-4 -mx-6 px-6 -mb-6 pb-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Package</Button>
      </DialogFooter>
    </form>
  );
};