import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

const STUDY_PERMIT_REQUIREMENTS = `[
  {
    "key": "passport",
    "label": "Passport",
    "description": "Valid passport with at least one blank page and minimum 6 months validity",
    "max_size_kb": 4096,
    "formats": ["PDF", "JPG", "PNG"],
    "optional": false,
    "sort_order": 1
  }
]`;

const WORK_PERMIT_REQUIREMENTS = `[
  {
    "key": "passport",
    "label": "Passport",
    "description": "Valid passport with at least one blank page",
    "max_size_kb": 4096,
    "formats": ["PDF", "JPG", "PNG"],
    "optional": false,
    "sort_order": 1
  }
]`;

const PR_PATHWAY_REQUIREMENTS = `[
  {
    "key": "passport",
    "label": "Passport",
    "description": "Valid passport for all family members",
    "max_size_kb": 4096,
    "formats": ["PDF", "JPG", "PNG"],
    "optional": false,
    "sort_order": 1
  }
]`;

const VISITOR_VISA_REQUIREMENTS = `[
  {
    "key": "passport",
    "label": "Passport",
    "description": "Valid passport with at least one blank page",
    "max_size_kb": 4096,
    "formats": ["PDF", "JPG", "PNG"],
    "optional": false,
    "sort_order": 1
  }
]`;

export default function VisaPackageForm({ pkg, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    icon: 'GraduationCap',
    price: 0,
    description: '',
    features: [],
    processingTime: '',
    successRate: '',
    supportLevel: '',
    popular: false,
    country: 'Canada',
    doc_requirements: [],
    upload_tips: []
  });

  const [docReqsString, setDocReqsString] = useState('');
  const [docReqsError, setDocReqsError] = useState('');
  const [tipsString, setTipsString] = useState('');

  const getDefaultRequirements = (packageName) => {
    const name = packageName.toLowerCase();
    if (name.includes('study') || name.includes('student')) return STUDY_PERMIT_REQUIREMENTS;
    if (name.includes('work')) return WORK_PERMIT_REQUIREMENTS;
    if (name.includes('pr') || name.includes('permanent') || name.includes('express')) return PR_PATHWAY_REQUIREMENTS;
    if (name.includes('visitor') || name.includes('tourist')) return VISITOR_VISA_REQUIREMENTS;
    return STUDY_PERMIT_REQUIREMENTS;
  };

  const getDefaultUploadTips = () => [
    "Ensure all documents are clear and legible (300 DPI recommended for scans)",
    "All documents must be in English or French, or include certified translations",
    "Combine multi-page documents into single PDF files",
    "File names should be descriptive (e.g., 'JohnDoe-Passport.pdf')",
    "Documents older than 3 months may not be accepted",
    "Ensure all personal information is clearly visible",
    "Do not submit edited or altered documents"
  ].join('\n');

  useEffect(() => {
    if (pkg) {
      setFormData(pkg);
      setDocReqsString(JSON.stringify(pkg.doc_requirements || [], null, 2));
      setTipsString((pkg.upload_tips || []).join('\n'));
    } else {
      setDocReqsString(STUDY_PERMIT_REQUIREMENTS);
      setTipsString(getDefaultUploadTips());
    }
  }, [pkg]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = { ...formData, [name]: type === 'checkbox' ? checked : value };
    setFormData(newFormData);

    if (name === 'name' && !pkg) {
      const defaultReqs = getDefaultRequirements(value);
      setDocReqsString(defaultReqs);
    }
  };

  const handleFeaturesChange = (e) => setFormData(prev => ({ ...prev, features: e.target.value.split('\n') }));
  const handleTipsChange = (e) => setTipsString(e.target.value);

  const handleDocReqsChange = (e) => {
    setDocReqsString(e.target.value);
    try {
      JSON.parse(e.target.value);
      setDocReqsError('');
    } catch (error) {
      setDocReqsError('Invalid JSON format.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (docReqsError) {
      alert('Please fix the JSON error in Document Requirements before saving.');
      return;
    }
    
    let finalData = { ...formData };
    try {
      finalData.doc_requirements = JSON.parse(docReqsString);
    } catch (e) {
      finalData.doc_requirements = [];
    }
    finalData.upload_tips = tipsString.split('\n').filter(tip => tip.trim() !== '');

    onSave(finalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
      <div className="grid grid-cols-2 gap-4">
        <Input name="name" placeholder="Package Name" value={formData.name} onChange={handleChange} required />
        <Input name="icon" placeholder="Lucide Icon Name" value={formData.icon} onChange={handleChange} required />
      </div>
      <Input name="price" placeholder="Price (USD)" type="number" value={formData.price} onChange={handleChange} required />
      <Input name="description" placeholder="Description" value={formData.description} onChange={handleChange} required />
      
      <Label htmlFor="features">Features (one per line)</Label>
      <Textarea id="features" name="features" placeholder="Feature 1\nFeature 2" value={formData.features?.join('\n')} onChange={handleFeaturesChange} rows={4} />
      
      <div className="grid grid-cols-3 gap-4">
        <Input name="processingTime" placeholder="Processing Time" value={formData.processingTime} onChange={handleChange} />
        <Input name="successRate" placeholder="Success Rate" value={formData.successRate} onChange={handleChange} />
        <Input name="supportLevel" placeholder="Support Level" value={formData.supportLevel} onChange={handleChange} />
      </div>

      <div>
        <Label htmlFor="doc_requirements">Document Requirements (JSON format)</Label>
        <Textarea
          id="doc_requirements"
          placeholder={STUDY_PERMIT_REQUIREMENTS}
          value={docReqsString}
          onChange={handleDocReqsChange}
          rows={10}
          className={docReqsError ? 'border-red-500' : ''}
        />
        {docReqsError && <p className="text-red-500 text-sm mt-1 flex items-center"><AlertTriangle className="inline-block w-4 h-4 mr-1"/>{docReqsError}</p>}
      </div>

      <div>
        <Label htmlFor="upload_tips">Upload Tips (one per line)</Label>
        <Textarea
          id="upload_tips"
          placeholder="Ensure scans are clear and high-resolution."
          value={tipsString}
          onChange={handleTipsChange}
          rows={4}
        />
      </div>

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
}