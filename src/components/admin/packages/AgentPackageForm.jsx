import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";

export default function AgentPackageForm({ pkg, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fee_usd_yearly: 0,
    notes: '',
    icon: 'Briefcase',
  });

  useEffect(() => {
    if (pkg) {
      setFormData(pkg);
    } else {
      setFormData({
        name: '',
        description: '',
        fee_usd_yearly: 0,
        notes: '',
        icon: 'Briefcase',
      });
    }
  }, [pkg]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
        ...formData,
        fee_usd_yearly: parseFloat(formData.fee_usd_yearly),
    };
    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
      <Input name="name" placeholder="Package Name" value={formData.name} onChange={handleChange} required />
      <Input name="icon" placeholder="Lucide Icon Name (e.g. Briefcase)" value={formData.icon} onChange={handleChange} required />
      <Input name="description" placeholder="Description" value={formData.description} onChange={handleChange} required />
      <Input name="fee_usd_yearly" placeholder="Yearly Fee (USD)" type="number" value={formData.fee_usd_yearly} onChange={handleChange} required />
      <Textarea name="notes" placeholder="Notes (e.g. performance targets)" value={formData.notes} onChange={handleChange} />

      <DialogFooter className="sticky bottom-0 bg-white pt-4 -mx-6 px-6 -mb-6 pb-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Package</Button>
      </DialogFooter>
    </form>
  );
};