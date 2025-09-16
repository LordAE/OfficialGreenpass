
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Case } from '@/api/entities';
import { School } from '@/api/entities';
import { User } from '@/api/entities';
import { VisaPackage } from '@/api/entities';
import { CheckCircle, FileText, Package } from 'lucide-react';

export default function CreateCaseModal({ open, onOpenChange, onCaseCreated }) {
  const [formData, setFormData] = useState({
    package_id: '',
    school_id: '',
    program_id: '',
    target_country: ''
  });
  const [schools, setSchools] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          const [schoolData, packageData] = await Promise.all([
            School.list(),
            VisaPackage.list()
          ]);
          setSchools(schoolData);
          setPackages(packageData);
        } catch (error) {
          console.error("Failed to fetch data:", error);
        }
      };
      fetchData();
    }
  }, [open]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getCaseTypeFromPackage = (packageName) => {
    const mapping = {
      "Student Visa Package": "Study Permit",
      "Work Visa Package": "Work Permit", 
      "PR Pathway Visa Package": "PR Pathway",
      "Family Sponsorship": "Family Sponsorship",
      "Tourist Visa Package": "Tourist Visa"
    };
    return mapping[packageName] || "Study Permit";
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      const selectedPackage = packages.find(p => p.id === formData.package_id);
      
      if (!selectedPackage) {
        alert('Please select a visa package');
        setLoading(false);
        return;
      }

      const caseType = getCaseTypeFromPackage(selectedPackage.name);
      
      // Initialize checklist from package requirements
      const checklist = selectedPackage.doc_requirements?.map(req => ({
        task: req.optional ? `${req.label} (Optional)` : req.label,
        status: "pending",
        document_url: ""
      })) || [];

      const newCaseData = {
        student_id: currentUser.id,
        package_id: formData.package_id,
        school_id: formData.school_id || null, // Ensure null if not provided
        program_id: formData.program_id || null, // Ensure null if not provided
        case_type: caseType,
        status: "Application Started",
        // Snapshot requirements and tips at case creation
        case_requirements: selectedPackage.doc_requirements || [],
        case_upload_tips: selectedPackage.upload_tips || [],
        checklist: checklist,
        timeline: [{
          event: "Application case created",
          date: new Date().toISOString(),
          actor: currentUser.full_name
        }]
      };

      // Check if user has an agent
      if (currentUser.referred_by_agent_id) {
        newCaseData.agent_id = currentUser.referred_by_agent_id;
      }

      const newCase = await Case.create(newCaseData);
      onCaseCreated(newCase);
      setCreated(true);
      
    } catch (error) {
      console.error("Failed to create case:", error);
      alert("Error creating case. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    onOpenChange(false);
    setTimeout(() => {
      setFormData({ package_id: '', school_id: '', program_id: '', target_country: '' });
      setCreated(false);
      setLoading(false);
    }, 300);
  };

  const selectedPackage = packages.find(p => p.id === formData.package_id);

  return (
    <Dialog open={open} onOpenChange={closeAndReset}>
      <DialogContent className="sm:max-w-md">
        {!created ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="text-emerald-500" />
                Start New Visa Application
              </DialogTitle>
              <DialogDescription>
                Select a visa package and provide basic information to begin your application.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div>
                <Label htmlFor="package_id">Visa Package *</Label>
                <Select value={formData.package_id} onValueChange={(v) => handleInputChange('package_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visa package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map(pkg => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          {pkg.name} - ${pkg.price}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPackage && (
                  <p className="text-sm text-gray-600 mt-1">{selectedPackage.description}</p>
                )}
              </div>

              {selectedPackage && getCaseTypeFromPackage(selectedPackage.name) === 'Study Permit' && (
                <>
                  <div>
                    <Label htmlFor="school_id">Target School</Label>
                    <Select value={formData.school_id} onValueChange={(v) => handleInputChange('school_id', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a school" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map(school => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name} - {school.country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="program_id">Program</Label>
                    <Input
                      placeholder="Program name (e.g., Computer Science)"
                      value={formData.program_id}
                      onChange={(e) => handleInputChange('program_id', e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="target_country">Target Country</Label>
                <Select value={formData.target_country} onValueChange={(v) => handleInputChange('target_country', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="Germany">Germany</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={!formData.package_id || !formData.target_country || loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white"
            >
              {loading ? 'Creating Application...' : 'Create Application'}
            </Button>
          </>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application Created!</h2>
            <p className="text-gray-600 mb-6">
              Your {getCaseTypeFromPackage(selectedPackage?.name)} application has been created. You can now upload documents and track progress.
            </p>
            <Button onClick={closeAndReset} className="w-full">
              View My Applications
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
