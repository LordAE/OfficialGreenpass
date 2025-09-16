import React, { useState, useEffect } from "react";
import { AgentPackage } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Star, Briefcase, Award, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ICONS = { Shield, Star, Briefcase, Award };

const PackageCard = ({ pkg }) => {
  const Icon = ICONS[pkg.icon] || Briefcase;
  return (
    <Card className="bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 border-2 rounded-2xl flex flex-col">
      <CardContent className="p-8 flex flex-col flex-grow">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{pkg.name}</h3>
          
          {pkg.fee_usd_yearly < 0 ? (
            <p className="text-4xl font-bold text-blue-600 my-2">Custom</p>
          ) : pkg.fee_usd_yearly === 0 ? (
             <p className="text-4xl font-bold text-blue-600 my-2">Free</p>
          ) : (
            <p className="text-4xl font-bold text-blue-600 my-2">
              ${pkg.fee_usd_yearly}
              <span className="text-lg font-medium text-gray-500">/year</span>
            </p>
          )}

          <p className="text-sm text-gray-600 h-10">{pkg.description}</p>
        </div>

        <div className="space-y-3 mb-6 flex-grow">
            <Badge variant="outline" className="text-center w-full justify-center py-2">{pkg.notes}</Badge>
        </div>
        
        <Button 
          className="w-full py-3 mt-8 font-semibold bg-blue-600 hover:bg-blue-700 text-white text-lg"
          disabled={pkg.fee_usd_yearly < 0}
        >
          {pkg.fee_usd_yearly < 0 ? 'Contact Us' : 'Select Package'}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

const AgentPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        const packageData = await AgentPackage.list();
        setPackages(packageData);
      } catch (error) {
        console.error("Failed to fetch packages:", error);
      }
      setLoading(false);
    };
    fetchPackages();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-gray-800 bg-clip-text text-transparent mb-4">
            Agent & Partner Packages
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Choose a partnership level that aligns with your business goals.
          </p>
        </div>

        {loading ? (
           <p className="text-center">Loading packages...</p>
        ) : (
            <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 mb-16 items-stretch">
              {packages.map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default AgentPackages;