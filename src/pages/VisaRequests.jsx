import React, { useState, useEffect } from "react";
import { Case } from "@/api/entities";
import { User } from "@/api/entities";
import { School } from "@/api/entities";
import { VisaPackage } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  MessageCircle,
  Calendar,
  Package as PackageIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const StatusBadge = ({ status }) => {
  const statusConfig = {
    "Application Started": { color: "bg-blue-100 text-blue-800", icon: Clock },
    "Documents Pending": { color: "bg-yellow-100 text-yellow-800", icon: Upload },
    "Under Review": { color: "bg-purple-100 text-purple-800", icon: FileText },
    Approved: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    Rejected: { color: "bg-red-100 text-red-800", icon: AlertCircle },
  };

  const config = statusConfig[status] || statusConfig["Application Started"];
  const IconComponent = config.icon;

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <IconComponent className="w-3 h-3" />
      {status}
    </Badge>
  );
};

const CaseCard = ({ case: caseData, school }) => {
  const checklist = Array.isArray(caseData?.checklist) ? caseData.checklist : [];
  const completedTasks = checklist.filter((item) => item?.status === "verified").length;
  const totalTasks = checklist.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const hasTimeline = Array.isArray(caseData?.timeline) && caseData.timeline.length > 0;
  const latestEvent = hasTimeline ? caseData.timeline[caseData.timeline.length - 1] : null;

  return (
    <Card className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">
              {caseData?.case_type || "Visa Application"}
            </CardTitle>
            <p className="text-gray-600 mt-1">{school?.name || "School TBD"}</p>
          </div>
          <StatusBadge status={caseData?.status || "Application Started"} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>
              {completedTasks}/{totalTasks} tasks completed
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {hasTimeline && latestEvent && (
          <div className="border-t pt-3">
            <p className="text-sm text-gray-500 mb-2">Latest Update:</p>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{latestEvent.event}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {/* IMPORTANT: do NOT use createPageUrl here, to avoid lowercasing the ID */}
          <Link
            to={`/visadocuments?caseId=${caseData.id}`}
            className="flex-1"
          >
            <Button variant="outline" className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              View Documents
            </Button>
          </Link>

          <Link to={createPageUrl("MyAgent")} className="flex-1">
            <Button className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default function VisaRequests() {
  const [cases, setCases] = useState([]);
  const [schools, setSchools] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const user = await User.me();
        setCurrentUser(user || null);

        const purchased = Array.isArray(user?.purchased_packages)
          ? user.purchased_packages
          : [];
        if (purchased.length === 0) {
          setCases([]);
          return;
        }

        // Load all packages (defensive)
        const allPackagesRaw = await VisaPackage.list();
        const allPackages = Array.isArray(allPackagesRaw) ? allPackagesRaw : [];

        // Build maps for name<->id
        const nameToId = new Map();
        allPackages.forEach((p) => {
          if (p?.name) nameToId.set(p.name, p.id);
        });

        // Separate purchased entries into ids vs names
        const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
        const purchasedIdSet = new Set(purchased.filter(isObjectId));
        const purchasedNameSet = new Set(purchased.filter((v) => !isObjectId(v)));

        // Resolve names to ids
        purchasedNameSet.forEach((name) => {
          const id = nameToId.get(name);
          if (id) purchasedIdSet.add(id);
        });

        // Load all cases for this user
        const allCasesRaw = await Case.filter(
          { student_id: user.id },
          "-created_date"
        );
        const allCases = Array.isArray(allCasesRaw) ? allCasesRaw : [];

        // Keep only cases whose package_id is in purchased set
        const purchasedCases = allCases.filter(
          (c) => c?.package_id && purchasedIdSet.has(c.package_id)
        );
        setCases(purchasedCases);

        // Fetch school data for those cases
        const schoolIds = [
          ...new Set(
            purchasedCases
              .map((c) => c?.school_id)
              .filter((id) => typeof id === "string" && id.length > 0)
          ),
        ];
        if (schoolIds.length > 0) {
          const schoolsRaw = await School.filter({ id: { $in: schoolIds } });
          const schoolsArr = Array.isArray(schoolsRaw) ? schoolsRaw : [];
          const schoolsMap = schoolsArr.reduce((acc, s) => {
            if (s?.id) acc[s.id] = s;
            return acc;
          }, {});
          setSchools(schoolsMap);
        } else {
          setSchools({});
        }
      } catch (err) {
        console.error("Failed to fetch visa cases:", err);
        // Fall back to empty safe state
        setCases([]);
        setSchools({});
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              My Visa Applications
            </h1>
            <p className="text-gray-600 text-lg mt-2">
              Track and manage your applications for your purchased visa packages.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !Array.isArray(currentUser?.purchased_packages) ||
          currentUser.purchased_packages.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No visa packages purchased
            </h3>
            <p className="text-gray-600 mb-6">
              Purchase a visa package to start your application process and track
              your progress here.
            </p>
            <Link to={createPageUrl("VisaPackages")}>
              <Button className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
                <PackageIcon className="w-5 h-5 mr-2" />
                Explore Visa Packages
              </Button>
            </Link>
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Applications being processed
            </h3>
            <p className="text-gray-600 mb-6">
              Your visa applications are being set up. They will appear here
              shortly.
            </p>
            <Link to={createPageUrl("VisaPackages")}>
              <Button className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
                <PackageIcon className="w-5 h-5 mr-2" />
                View Your Packages
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {cases.map((caseData) => (
              <CaseCard
                key={caseData.id}
                case={caseData}
                school={schools[caseData.school_id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
