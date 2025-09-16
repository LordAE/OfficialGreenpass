import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";

export default function TutorPackageForm({ pkg, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    icon: 'Star',
    price_cad_monthly: 0,
    commission_rate: 0,
    key_benefits: [],
    popular: false,
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
        icon: 'Star',
        price_cad_monthly: 0,
        commission_rate: 0,
        key_benefits: [],
        popular: false,
      });
    }
  }, [pkg]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleBenefitsChange = (e) => {
    setFormData(prev => ({ ...prev, key_benefits: e.target.value.split('\n') }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
        ...formData,
        price_cad_monthly: parseFloat(formData.price_cad_monthly),
        commission_rate: parseFloat(formData.commission_rate),
        key_benefits: formData.key_benefits.filter(b => b.trim() !== '')
    };
    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
      <Input name="name" placeholder="Package Name" value={formData.name} onChange={handleChange} required />
      <Input name="icon" placeholder="Lucide Icon Name (e.g. Star)" value={formData.icon} onChange={handleChange} required />
      <div className="grid grid-cols-2 gap-4">
        <Input name="price_cad_monthly" placeholder="Monthly Price (CAD)" type="number" value={formData.price_cad_monthly} onChange={handleChange} required />
        <Input name="commission_rate" placeholder="Commission Rate (%)" type="number" value={formData.commission_rate} onChange={handleChange} required />
      </div>
      
      <Label htmlFor="key_benefits">Key Benefits (one per line)</Label>
      <Textarea id="key_benefits" name="key_benefits" placeholder="Benefit 1\nBenefit 2" value={formData.key_benefits?.join('\n')} onChange={handleBenefitsChange} rows={5} />

      <div className="flex items-center space-x-2">
        <Checkbox id="popular" name="popular" checked={formData.popular} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, popular: checked }))} />
        <Label htmlFor="popular">Mark as Popular</Label>
      </div>

      <DialogFooter className="sticky bottom-0 bg-white pt-4 -mx-6 px-6 -mb-6 pb-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Package</Button>
      </DialogFooter>
    </form>
  );
};