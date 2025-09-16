import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Agent } from '@/api/entities';
import { Tutor } from '@/api/entities';
import { School } from '@/api/entities';
import { Vendor } from '@/api/entities';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const getProfileCompletionData = (user, relatedEntity) => {
  const requirements = {
    user: [
      { field: 'full_name', label: 'Full Name', completed: !!user?.full_name },
      { field: 'phone', label: 'Phone Number', completed: !!user?.phone },
      { field: 'country', label: 'Country', completed: !!user?.country }
    ],
    agent: [
      { field: 'full_name', label: 'Full Name', completed: !!user?.full_name },
      { field: 'phone', label: 'Phone Number', completed: !!user?.phone },
      { field: 'country', label: 'Country', completed: !!user?.country },
      { field: 'company_name', label: 'Company Name', completed: !!relatedEntity?.company_name },
      { field: 'business_license_mst', label: 'Business License', completed: !!relatedEntity?.business_license_mst },
      { field: 'paypal_email', label: 'PayPal Email', completed: !!relatedEntity?.paypal_email }
    ],
    tutor: [
      { field: 'full_name', label: 'Full Name', completed: !!user?.full_name },
      { field: 'phone', label: 'Phone Number', completed: !!user?.phone },
      { field: 'country', label: 'Country', completed: !!user?.country },
      { field: 'specializations', label: 'Specializations', completed: relatedEntity?.specializations?.length > 0 },
      { field: 'experience_years', label: 'Experience Years', completed: !!relatedEntity?.experience_years },
      { field: 'hourly_rate', label: 'Hourly Rate', completed: !!relatedEntity?.hourly_rate },
      { field: 'bio', label: 'Professional Bio', completed: !!relatedEntity?.bio },
      { field: 'paypal_email', label: 'PayPal Email', completed: !!relatedEntity?.paypal_email }
    ],
    school: [
      { field: 'full_name', label: 'Contact Name', completed: !!user?.full_name },
      { field: 'phone', label: 'Phone Number', completed: !!user?.phone },
      { field: 'country', label: 'Country', completed: !!user?.country },
      { field: 'name', label: 'School Name', completed: !!relatedEntity?.name },
      { field: 'location', label: 'Location', completed: !!relatedEntity?.location },
      { field: 'about', label: 'About School', completed: !!relatedEntity?.about },
      { field: 'website', label: 'Website', completed: !!relatedEntity?.website }
    ],
    vendor: [
      { field: 'full_name', label: 'Full Name', completed: !!user?.full_name },
      { field: 'phone', label: 'Phone Number', completed: !!user?.phone },
      { field: 'country', label: 'Country', completed: !!user?.country },
      { field: 'business_name', label: 'Business Name', completed: !!relatedEntity?.business_name },
      { field: 'service_categories', label: 'Service Categories', completed: relatedEntity?.service_categories?.length > 0 },
      { field: 'paypal_email', label: 'PayPal Email', completed: !!relatedEntity?.paypal_email }
    ]
  };

  const userType = user?.user_type === 'student' ? 'user' : user?.user_type || 'user';
  const userRequirements = requirements[userType] || requirements.user;
  
  const completedCount = userRequirements.filter(req => req.completed).length;
  const totalCount = userRequirements.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const missingFields = userRequirements.filter(req => !req.completed);

  return {
    percentage,
    completedCount,
    totalCount,
    missingFields,
    isComplete: percentage === 100
  };
};

export default function ProfileCompletionBanner({ user, relatedEntity, onDismiss }) {
  const completionData = getProfileCompletionData(user, relatedEntity);
  
  if (completionData.isComplete) {
    return null;
  }

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-orange-800 mb-2">Complete Your Profile</h4>
            <p className="text-orange-700 mb-3">
              Complete your profile to access all platform features. 
              {completionData.missingFields.length > 0 && (
                <span className="font-medium">
                  {' '}Missing: {completionData.missingFields.map(f => f.label).join(', ')}
                </span>
              )}
            </p>
            <div className="flex items-center gap-4">
              <Progress value={completionData.percentage} className="flex-1 h-2" />
              <span className="text-sm font-medium text-orange-800">
                {completionData.percentage}% Complete
              </span>
            </div>
          </div>
          <Link to={createPageUrl('Profile')}>
            <Button className="ml-4 bg-orange-600 hover:bg-orange-700">
              Complete Profile <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export { getProfileCompletionData };