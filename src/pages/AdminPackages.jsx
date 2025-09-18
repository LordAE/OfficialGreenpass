// src/pages/AdminPackages.jsx
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package } from "lucide-react";
import PackageEditor from "../components/admin/packages/PackageEditor";

// Swap Base44 entities → Firebase repos
import {
  VisaPackageRepo,
  TutorPackageRepo,
  AgentPackageRepo,
  StudentTutorPackageRepo,
  // or use makePackageRepo("collectionName") inline if you prefer
} from "@/api/packagesRepo";

// Forms & columns unchanged
import VisaPackageForm from "../components/admin/packages/VisaPackageForm";
import TutorPackageForm from "../components/admin/packages/TutorPackageForm";
import AgentPackageForm from "../components/admin/packages/AgentPackageForm";
import StudentTutorPackageForm from "../components/admin/packages/StudentTutorPackageForm";

import {
  visaPackageColumns,
  tutorPackageColumns,
  agentPackageColumns,
  studentTutorPackageColumns,
} from "../components/admin/packages/columns";

export default function AdminPackages() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package /> Package Management
          </h1>
        </div>

        <Tabs defaultValue="visa" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="visa">Visa Packages</TabsTrigger>
            <TabsTrigger value="tutor">Tutor Packages</TabsTrigger>
            <TabsTrigger value="agent">Agent Packages</TabsTrigger>
            <TabsTrigger value="student_tutor">Student Packages</TabsTrigger>
          </TabsList>

          <TabsContent value="visa" className="mt-4">
            <PackageEditor
              entity={VisaPackageRepo}
              FormComponent={VisaPackageForm}
              columns={visaPackageColumns}
              title="Visa Package"
              formDialogMaxWidth="max-w-3xl"
            />
          </TabsContent>

          <TabsContent value="tutor" className="mt-4">
            <PackageEditor
              entity={TutorPackageRepo}
              FormComponent={TutorPackageForm}
              columns={tutorPackageColumns}
              title="Tutor Package"
            />
          </TabsContent>

          <TabsContent value="agent" className="mt-4">
            <PackageEditor
              entity={AgentPackageRepo}
              FormComponent={AgentPackageForm}
              columns={agentPackageColumns}
              title="Agent Package"
            />
          </TabsContent>

          <TabsContent value="student_tutor" className="mt-4">
            <PackageEditor
              entity={StudentTutorPackageRepo}
              FormComponent={StudentTutorPackageForm}
              columns={studentTutorPackageColumns}
              title="Student Tutor Package"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
