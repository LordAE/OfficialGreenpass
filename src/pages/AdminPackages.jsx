import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package } from "lucide-react";
import PackageEditor from '../components/admin/packages/PackageEditor';

// Import Entities
import { VisaPackage } from '@/api/entities';
import { TutorPackage } from '@/api/entities';
import { AgentPackage } from '@/api/entities';
import { StudentTutorPackage } from '@/api/entities';

// Import Forms
import VisaPackageForm from '../components/admin/packages/VisaPackageForm';
import TutorPackageForm from '../components/admin/packages/TutorPackageForm';
import AgentPackageForm from '../components/admin/packages/AgentPackageForm';
import StudentTutorPackageForm from '../components/admin/packages/StudentTutorPackageForm';

// Import Table Columns
import { visaPackageColumns } from '../components/admin/packages/columns';
import { tutorPackageColumns } from '../components/admin/packages/columns';
import { agentPackageColumns } from '../components/admin/packages/columns';
import { studentTutorPackageColumns } from '../components/admin/packages/columns';

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
              entity={VisaPackage}
              FormComponent={VisaPackageForm}
              columns={visaPackageColumns}
              title="Visa Package"
              formDialogMaxWidth="max-w-3xl"
            />
          </TabsContent>

          <TabsContent value="tutor" className="mt-4">
            <PackageEditor
              entity={TutorPackage}
              FormComponent={TutorPackageForm}
              columns={tutorPackageColumns}
              title="Tutor Package"
            />
          </TabsContent>

          <TabsContent value="agent" className="mt-4">
            <PackageEditor
              entity={AgentPackage}
              FormComponent={AgentPackageForm}
              columns={agentPackageColumns}
              title="Agent Package"
            />
          </TabsContent>
          
          <TabsContent value="student_tutor" className="mt-4">
            <PackageEditor
              entity={StudentTutorPackage}
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