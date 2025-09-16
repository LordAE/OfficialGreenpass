import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const ActionBlocker = ({ 
  isBlocked, 
  title = "Profile Incomplete", 
  message = "Please complete your profile to access this feature.",
  actionText = "Complete Profile",
  children 
}) => {
  if (!isBlocked) {
    return children;
  }

  return (
    <div className="relative">
      {/* Overlay to block interaction */}
      <div className="relative">
        <div className="pointer-events-none opacity-50">
          {children}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
          <Alert className="max-w-md border-yellow-200 bg-yellow-50">
            <Shield className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">{title}</AlertTitle>
            <AlertDescription className="text-yellow-700 mt-2">
              <p className="mb-3">{message}</p>
              <Link to={createPageUrl('Profile')}>
                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                  {actionText} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};

export default ActionBlocker;