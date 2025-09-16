
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Case } from '@/api/entities';
import { VisaDocument } from '@/api/entities';
import { User } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { VisaPackage } from '@/api/entities'; // Added import for VisaPackage

const DEFAULT_UPLOAD_TIPS = [
    "Ensure all scans are clear and high-resolution (300 DPI recommended).",
    "Merge multi-page documents like bank statements into a single PDF file.",
    "File size should not exceed 4MB (240KB for photos).",
    "Accepted formats: PDF, JPG, JPEG, PNG, DOC, DOCX.",
    "Use clear filenames, e.g., 'JohnDoe-Passport.pdf'."
];

const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
    approved: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    denied: { color: "bg-red-100 text-red-800", icon: XCircle },
    changes_requested: { color: "bg-orange-100 text-orange-800", icon: AlertCircle }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const IconComponent = config.icon;

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <IconComponent className="w-3 h-3" />
      {status.replace(/_/g, ' ').toUpperCase()}
    </Badge>
  );
};

const DocumentCard = ({ document, onDelete }) => (
  <Card className="bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200">
    <CardContent className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{document.label}</h3>
          <p className="text-sm text-gray-500">
            Uploaded on {format(new Date(document.uploaded_at || document.created_date), 'MMMM d, yyyy')}
          </p>
        </div>
        <StatusBadge status={document.status} />
      </div>

      {document.reviewer_note && (
        <div className="bg-gray-50 p-3 rounded-lg mb-3">
            <p className="font-medium text-sm flex items-center gap-1"><Info className="w-4 h-4 text-blue-500"/>Note from Reviewer</p>
            <p className="text-sm text-gray-600 mt-1">{document.reviewer_note}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button asChild variant="ghost" size="sm">
          <a href={document.file_url} target="_blank" rel="noopener noreferrer">
            <Eye className="w-4 h-4" />
          </a>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.open(document.file_url, '_blank')}>
          <Download className="w-4 h-4" />
        </Button>
        {document.status !== 'approved' && (
          <Button variant="ghost" size="sm" onClick={() => onDelete(document)} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

const RequiredDocumentsCard = ({ requirements, checklist }) => {
  const getRequirementStatus = useCallback((requirement) => {
    const taskLabel = requirement.optional ? `${requirement.label} (Optional)` : requirement.label;
    const checklistItem = checklist?.find(item => item.task === taskLabel);

    if (!checklistItem || !checklistItem.document_url) return 'missing';

    // Map case.checklist status to UI status
    const statusMap = {
      'verified': 'approved',
      'uploaded': 'uploaded',
      'rejected': 'denied',
      'pending': 'uploaded' // If URL exists but status is pending, it's considered "uploaded" by user
    };
    return statusMap[checklistItem.status] || 'uploaded';
  }, [checklist]);

  const statusIcons = {
    approved: <CheckCircle className="w-5 h-5 text-green-500" />,
    uploaded: <Clock className="w-5 h-5 text-yellow-500" />,
    denied: <XCircle className="w-5 h-5 text-red-500" />,
    missing: <div className="w-5 h-5 flex items-center justify-center"><div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div></div>,
  };

  const { approvedCount, totalRequired } = useMemo(() => {
    const required = requirements.filter(r => !r.optional);
    const approved = required.filter(r => getRequirementStatus(r) === 'approved').length;
    return { approvedCount: approved, totalRequired: required.length };
  }, [requirements, getRequirementStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Required Documents</CardTitle>
        <p className="text-sm text-gray-600">
          {approvedCount} of {totalRequired} required documents approved.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {requirements?.map((req) => {
            const status = getRequirementStatus(req);
            return (
              <div key={req.key} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 pointer-events-none">
                {statusIcons[status]}
                <div className="flex-1">
                  <p className="font-medium text-sm">{req.label}</p>
                  {req.optional && <span className="text-xs text-gray-500">(Optional)</span>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const UploadTipsCard = ({ tips }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Upload Tips</CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="space-y-3 text-sm">
        {(tips && tips.length > 0 ? tips : DEFAULT_UPLOAD_TIPS).map((tip, index) => (
          <li key={index} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export default function VisaDocuments() {
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('caseId');

  const [caseData, setCaseData] = useState(null);
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [requiredDocs, setRequiredDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');

  // My Documents state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [documentsPage, setDocumentsPage] = useState(1);
  const documentsPerPage = 10;

  // Upload form state
  const [selectedDocKey, setSelectedDocKey] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [userNote, setUserNote] = useState('');

  const loadCaseData = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
        const currentUser = await User.me();
        setUser(currentUser);

        const caseResult = await Case.filter({ id: caseId });
        if (!caseResult || caseResult.length === 0) {
            throw new Error("Case not found");
        }
        const currentCase = caseResult[0];
        setCaseData(currentCase);

        // Use case-specific requirements, with a fallback for older cases
        if (currentCase.case_requirements && currentCase.case_requirements.length > 0) {
            setRequiredDocs(currentCase.case_requirements);
        } else if (currentCase.package_id) {
            console.warn("Case is missing embedded requirements. Falling back to package lookup.");
            try {
                const pkg = await VisaPackage.get(currentCase.package_id);
                if (pkg && pkg.doc_requirements) {
                    setRequiredDocs(pkg.doc_requirements);
                } else {
                    setRequiredDocs([]);
                }
            } catch (pkgError) {
                console.error("Could not fetch package for fallback requirements:", pkgError);
                setRequiredDocs([]);
            }
        } else {
            setRequiredDocs([]); // Fallback to empty if not set
        }

        const documentsResult = await VisaDocument.filter({ case_id: caseId, user_id: currentUser.id }, '-uploaded_at');
        setDocuments(documentsResult);

    } catch (error) {
        console.error('Error loading case data:', error);
    } finally {
        setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadCaseData();
  }, [loadCaseData]);

  const handleFileUpload = async () => {
    if (!uploadFile || !selectedDocKey || !caseData || !user) return;

    const selectedReq = requiredDocs.find(req => req.key === selectedDocKey);
    if (!selectedReq) return;

    // Validate file
    const maxKB = selectedReq.max_size_kb ?? 4096;
    const allowedFormats = selectedReq.formats ?? ["PDF","JPG","JPEG","PNG","DOC","DOCX"];
    const fileSizeKB = Math.ceil(uploadFile.size / 1024);
    const fileExtension = uploadFile.name.split('.').pop().toUpperCase();

    if (fileSizeKB > maxKB) {
      alert(`File size exceeds limit. Max size: ${maxKB / 1024} MB`);
      return;
    }

    if (!allowedFormats.includes(fileExtension)) {
      alert(`File format not accepted. Please use one of: ${allowedFormats.join(', ')}`);
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file: uploadFile });

      // Create VisaDocument record
      await VisaDocument.create({
        case_id: caseId,
        user_id: user.id,
        name_key: selectedReq.key,
        label: selectedReq.label,
        file_url: file_url,
        mime_type: uploadFile.type,
        size_kb: fileSizeKB,
        status: 'pending',
        note_from_user: userNote,
        uploaded_at: new Date().toISOString()
      });

      // Update case checklist and timeline
      const updatedCase = { ...caseData };
      const taskLabel = selectedReq.optional ? `${selectedReq.label} (Optional)` : selectedReq.label;
      let checklistIndex = updatedCase.checklist.findIndex(item => item.task === taskLabel);

      if (checklistIndex !== -1) {
        updatedCase.checklist[checklistIndex].document_url = file_url;
        updatedCase.checklist[checklistIndex].status = 'uploaded';
      } else {
        // If task not found, add it. This is a safeguard.
        updatedCase.checklist.push({ task: taskLabel, status: 'uploaded', document_url: file_url });
      }

      updatedCase.timeline.push({
        event: `Uploaded: ${selectedReq.label}`,
        date: new Date().toISOString(),
        actor: user.full_name
      });

      await Case.update(caseId, {
        checklist: updatedCase.checklist,
        timeline: updatedCase.timeline
      });

      alert('Document uploaded successfully!');

      // Refresh all data and switch tab
      await loadCaseData();
      setActiveTab('documents');

      // Reset form
      setSelectedDocKey('');
      setUploadFile(null);
      setUserNote('');

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentToDelete) => {
    if (documentToDelete.status === 'approved') {
      alert('Cannot delete approved documents.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        await VisaDocument.delete(documentToDelete.id);

        // Optimistically update UI
        setDocuments(prev => prev.filter(doc => doc.id !== documentToDelete.id));

        const updatedCase = { ...caseData };
        const taskLabel = documentToDelete.label;
        const checklistIndex = updatedCase.checklist.findIndex(item =>
          item.task === taskLabel || item.task === `${taskLabel} (Optional)`
        );

        if (checklistIndex !== -1) {
          // Check if there's another document of the same type. If not, reset checklist item.
          const otherDocs = documents.filter(d => d.name_key === documentToDelete.name_key && d.id !== documentToDelete.id);
          if (otherDocs.length === 0) {
            updatedCase.checklist[checklistIndex].document_url = '';
            updatedCase.checklist[checklistIndex].status = 'pending';
            await Case.update(caseId, { checklist: updatedCase.checklist });
            setCaseData(updatedCase);
          }
        }
        alert('Document deleted.');
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete document.');
        // Re-fetch data to correct optimistic update
        loadCaseData();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Case Not Found</h2>
          <p className="text-gray-600">The visa application case you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Filter documents for "My Documents" tab
  const filteredDocuments = documents.filter(doc => {
    const searchMatch = doc.label.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'all' || doc.status === statusFilter;
    return searchMatch && statusMatch;
  });

  const startIndex = (documentsPage - 1) * documentsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + documentsPerPage);
  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);

  const selectedRequirement = requiredDocs.find(req => req.key === selectedDocKey);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("VisaRequests")} className="text-gray-600 hover:text-gray-900">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Applications
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Document Management
            </h1>
            <p className="text-gray-600 text-lg mt-1">
              {caseData.case_type} Application
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm">
                <TabsTrigger value="documents">My Documents</TabsTrigger>
                <TabsTrigger value="upload">Upload New</TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-6">
                <Card>
                  <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search documents by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                        <SelectItem value="changes_requested">Changes Requested</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {paginatedDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Documents Found</h3>
                    <p className="text-gray-600">Upload your first document to get started or adjust your filters.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      {paginatedDocuments.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onDelete={handleDeleteDocument}
                        />
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-4 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setDocumentsPage(prev => Math.max(1, prev - 1))}
                          disabled={documentsPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {documentsPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          onClick={() => setDocumentsPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={documentsPage === totalPages}
                        >
                          Next <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="upload" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload New Document</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="docType">Document Type *</Label>
                      <Select value={selectedDocKey} onValueChange={setSelectedDocKey}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          {requiredDocs.map((req) => (
                            <SelectItem key={req.key} value={req.key}>
                              {req.label} {req.optional && '(Optional)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedRequirement && (
                        <p className="text-sm text-gray-600 mt-2">
                          Accepted: {(selectedRequirement.formats || []).join(', ')} • Max size: {((selectedRequirement.max_size_kb || 4096) / 1024).toFixed(1)} MB
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="file">Select File *</Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        accept={selectedRequirement?.formats?.map(f => `.${f.toLowerCase()}`).join(',')}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                      />
                      {selectedRequirement?.description && (
                        <p className="text-sm text-gray-600 mt-2">{selectedRequirement.description}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="note">Note to Reviewer (Optional)</Label>
                      <Textarea
                        id="note"
                        placeholder="Add any additional information about this document..."
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={handleFileUpload}
                      disabled={!selectedDocKey || !uploadFile || uploading}
                      className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Document'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <RequiredDocumentsCard
              requirements={requiredDocs}
              checklist={caseData.checklist}
            />
            <UploadTipsCard tips={caseData.case_upload_tips} />
          </div>
        </div>
      </div>
    </div>
  );
}
