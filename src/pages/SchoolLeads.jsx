import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Search, Mail, Phone, MessageSquare, Loader2, Info, Lock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { db, auth } from '@/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { useSubscriptionMode } from '@/hooks/useSubscriptionMode';

const StatusBadge = ({ status = '' }) => {
  const colors = {
    interested: 'bg-pink-100 text-pink-800',
    contacted: 'bg-blue-100 text-blue-800',
    closed: 'bg-gray-100 text-gray-800',
  };

  return (
    <Badge className={`${colors[status] || 'bg-gray-100 text-gray-800'} capitalize`}>
      {String(status || 'interested').replace(/_/g, ' ')}
    </Badge>
  );
};

function resolveUserRole(userDoc) {
  return String(
    userDoc?.role ||
    userDoc?.selected_role ||
    userDoc?.user_type ||
    userDoc?.userType ||
    'user'
  ).toLowerCase().trim();
}

function isSubInactiveForRole(userDoc) {
  const role = resolveUserRole(userDoc);
  if (!(role === 'agent' || role === 'tutor' || role === 'school')) return false;

  if (userDoc?.subscription_active === true) return false;
  const s = String(userDoc?.subscription_status || '').toLowerCase().trim();
  return !(s === 'active' || s === 'trialing');
}

function maskName(name) {
  const value = String(name || '').trim();
  if (!value) return 'Locked Lead';

  const parts = value.split(/\s+/).filter(Boolean);
  return parts
    .map((part) => {
      if (part.length <= 1) return '*';
      if (part.length === 2) return `${part[0]}*`;
      return `${part[0]}${'*'.repeat(Math.max(1, part.length - 1))}`;
    })
    .join(' ');
}

function maskEmail(email) {
  const value = String(email || '').trim();
  if (!value || !value.includes('@')) return '********';

  const [local, domain] = value.split('@');
  const maskedLocal =
    local.length <= 1
      ? '*'
      : `${local[0]}${'*'.repeat(Math.max(3, local.length - 1))}`;

  const domainParts = String(domain || '').split('.');
  const domainName = domainParts[0] || '';
  const tld = domainParts.slice(1).join('.');

  const maskedDomainName =
    domainName.length <= 1
      ? '*'
      : `${domainName[0]}${'*'.repeat(Math.max(2, domainName.length - 1))}`;

  return `${maskedLocal}@${maskedDomainName}${tld ? `.${tld}` : ''}`;
}

function maskPhone(phone) {
  const value = String(phone || '').trim();
  if (!value) return '';

  const digits = value.replace(/\D/g, '');
  if (!digits) return '********';
  if (digits.length <= 4) return '*'.repeat(digits.length);

  const visible = digits.slice(-2);
  return `${'*'.repeat(Math.max(6, digits.length - 2))}${visible}`;
}

export default function SchoolLeads() {
  const navigate = useNavigate();
  const { subscriptionModeEnabled } = useSubscriptionMode();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [meDoc, setMeDoc] = useState(null);
  const [updatingLeadId, setUpdatingLeadId] = useState('');

  const shouldMaskLeadInfo =
    subscriptionModeEnabled && isSubInactiveForRole(meDoc);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const fbUser = auth.currentUser;

      if (!fbUser?.uid) {
        setLeads([]);
        setMeDoc(null);
        return;
      }

      try {
        const meSnap = await getDoc(doc(db, 'users', fbUser.uid));
        setMeDoc(meSnap.exists() ? meSnap.data() : null);
      } catch (e) {
        console.error('Error loading current user doc:', e);
        setMeDoc(null);
      }

      const qLead = query(
        collection(db, 'school_leads'),
        where('school_owner_user_id', '==', fbUser.uid)
      );

      const leadSnap = await getDocs(qLead);

      const schoolLeads = leadSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      schoolLeads.sort((a, b) => {
        const ad =
          a.created_date
            ? new Date(a.created_date).getTime()
            : a.created_at?.toDate
              ? a.created_at.toDate().getTime()
              : 0;

        const bd =
          b.created_date
            ? new Date(b.created_date).getTime()
            : b.created_at?.toDate
              ? b.created_at.toDate().getTime()
              : 0;

        return bd - ad;
      });

      if (schoolLeads.length === 0) {
        setLeads([]);
        return;
      }

      const studentIds = [...new Set(schoolLeads.map((l) => l.student_id).filter(Boolean))];

      const studentsData = studentIds.length
        ? await User.filter({ id: { $in: studentIds } })
        : [];

      const studentsMap = (studentsData || []).reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {});

      const combinedLeads = schoolLeads.map((lead) => ({
        ...lead,
        student: lead.student_id ? studentsMap[lead.student_id] : undefined,
      }));

      setLeads(combinedLeads);
    } catch (error) {
      console.error('Error loading school leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filteredLeads = leads.filter((lead) => {
    const term = (searchTerm || '').toLowerCase();

    const visibleName = shouldMaskLeadInfo
      ? maskName(lead.student?.full_name || lead.student_name || '')
      : (lead.student?.full_name || lead.student_name || '');

    const visibleEmail = shouldMaskLeadInfo
      ? maskEmail(lead.student?.email || lead.student_email || '')
      : (lead.student?.email || lead.student_email || '');

    const visiblePhone = shouldMaskLeadInfo
      ? maskPhone(lead.student?.phone || lead.student_phone || '')
      : (lead.student?.phone || lead.student_phone || '');

    return (
      visibleName.toLowerCase().includes(term) ||
      visibleEmail.toLowerCase().includes(term) ||
      visiblePhone.toLowerCase().includes(term)
    );
  });

  const stats = {
    totalLeads: leads.length,
    interested: leads.filter((l) => (l.status || 'interested') === 'interested').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
  };

  const formatLeadDate = (lead) => {
    try {
      if (lead.created_date) {
        return format(new Date(lead.created_date), 'MMM dd, yyyy');
      }

      if (lead.created_at?.toDate) {
        return format(lead.created_at.toDate(), 'MMM dd, yyyy');
      }

      return '—';
    } catch {
      return '—';
    }
  };

  const handleMessageLead = (lead) => {
    const studentId = lead?.student_id || lead?.student?.id;
    if (!studentId) return;

    const qs = new URLSearchParams();
    qs.set('to', studentId);
    qs.set('toRole', 'user');

    navigate(`${createPageUrl("Messages")}?${qs.toString()}`, {
      state: {
        source: 'school_leads',
        leadId: lead.id,
        studentId,
      },
    });
  };

  const handleMarkContacted = async (lead) => {
    if (!lead?.id) return;
    if ((lead.status || 'interested') === 'contacted') return;

    setUpdatingLeadId(lead.id);

    const previousLeads = leads;

    try {
      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                status: 'contacted',
                updated_at: { toDate: () => new Date() },
              }
            : item
        )
      );

      await updateDoc(doc(db, 'school_leads', lead.id), {
        status: 'contacted',
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking lead as contacted:', error);
      setLeads(previousLeads);
      alert('Failed to update lead status to contacted.');
    } finally {
      setUpdatingLeadId('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Users className="w-8 h-8 text-pink-700" />
          <h1 className="text-4xl font-bold text-gray-800">Student Leads</h1>
        </div>

        {shouldMaskLeadInfo && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 text-amber-900">
                <Lock className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-semibold">Lead details are locked</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Subscription mode is enabled. Activate your subscription to view full student name, email, and phone number.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-pink-600">{stats.totalLeads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-pink-500">{stats.interested}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.contacted}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder={
                  shouldMaskLeadInfo
                    ? "Search visible masked lead info..."
                    : "Search by student name, email, or phone..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Lead Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLeads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Date Interested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const rawName = lead.student?.full_name || lead.student_name || 'Unnamed Student';
                    const rawEmail = lead.student?.email || lead.student_email || '—';
                    const rawPhone = lead.student?.phone || lead.student_phone || '';

                    const displayName = shouldMaskLeadInfo ? maskName(rawName) : rawName;
                    const displayEmail = shouldMaskLeadInfo ? maskEmail(rawEmail) : rawEmail;
                    const displayPhone = shouldMaskLeadInfo ? maskPhone(rawPhone) : rawPhone;
                    const isContacted = (lead.status || 'interested') === 'contacted';
                    const isUpdating = updatingLeadId === lead.id;

                    return (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{displayName}</p>

                            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                              <Mail className="w-3 h-3" />
                              {displayEmail}
                            </div>

                            {rawPhone && (
                              <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <Phone className="w-3 h-3" />
                                {displayPhone}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>{formatLeadDate(lead)}</TableCell>

                        <TableCell>
                          <StatusBadge status={lead.status || 'interested'} />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleMessageLead(lead)}
                              disabled={!lead?.student_id && !lead?.student?.id}
                            >
                              <MessageSquare className="w-4 h-4" />
                              Message
                            </Button>

                            <Button
                              variant={isContacted ? "secondary" : "default"}
                              size="sm"
                              className="gap-2"
                              onClick={() => handleMarkContacted(lead)}
                              disabled={isContacted || isUpdating}
                            >
                              {isUpdating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              {isContacted ? 'Contacted' : 'Mark Contacted'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Info className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Leads Found</h3>
                <p className="text-gray-600">
                  When students click Interested on your school profile, they will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}