import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Building, 
  Users, 
  QrCode, 
  Settings,
  Download,
  CheckCircle,
  Clock,
  Search,
  Filter
} from 'lucide-react';
import { ExhibitorRegistration } from '@/api/entities';
import { StudentRSVP } from '@/api/entities';
import { Event } from '@/api/entities';
import { format } from 'date-fns';

export default function AdminEventDashboard({ open, onOpenChange, event }) {
  const [activeTab, setActiveTab] = useState('exhibitors');
  const [exhibitors, setExhibitors] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [eventSettings, setEventSettings] = useState(event);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [exhibitorData, studentData] = await Promise.all([
        ExhibitorRegistration.filter({ event_id: event.event_id }),
        StudentRSVP.filter({ event_id: event.event_id })
      ]);
      setExhibitors(exhibitorData);
      setStudents(studentData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (exhibitorId, newStatus) => {
    try {
      let updatedData = { status: newStatus };
      if (newStatus === 'paid') {
          const exhibitor = exhibitors.find(e => e.id === exhibitorId);
          updatedData.ticket_qr_url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${event.event_id}-EXHIBITOR-${exhibitor.user_id}`;
      }
      await ExhibitorRegistration.update(exhibitorId, updatedData);
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAssignBooth = async (exhibitorId, boothNumber) => {
    if (!boothNumber) return;
    try {
      await ExhibitorRegistration.update(exhibitorId, { booth_number: boothNumber });
      await loadData();
    } catch (error) {
      console.error('Error assigning booth:', error);
    }
  };
  
  const handleCheckIn = async (type, id) => {
    try {
      const Model = type === 'exhibitor' ? ExhibitorRegistration : StudentRSVP;
      await Model.update(id, { checked_in: true });
      await loadData();
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };
  
  const handleSettingsChange = (field, value) => {
    setEventSettings(prev => ({ ...prev, [field]: value}));
  };
  
  const handleBankDetailsChange = (field, value) => {
    setEventSettings(prev => ({ ...prev, bank_details: { ...prev.bank_details, [field]: value } }));
  }

  const handleSaveSettings = async () => {
      try {
          await Event.update(event.id, eventSettings);
          alert('Settings saved!');
      } catch (error) {
          console.error('Failed to save settings', error);
          alert('Error saving settings.');
      }
  };

  const getStatusBadge = (status) => {
    const config = {
      paid: { color: 'bg-green-100 text-green-800', text: 'Paid' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      refunded: { color: 'bg-red-100 text-red-800', text: 'Refunded' }
    };
    const { color, text } = config[status] || {};
    return <Badge className={color}>{text}</Badge>;
  };

  const filteredExhibitors = exhibitors.filter(ex => 
    (ex.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) || ex.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === 'all' || ex.status === statusFilter)
  );

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const ExhibitorsTab = () => (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Search exhibitors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-md bg-white"><option value="all">All Status</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="refunded">Refunded</option></select>
        <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
      </div>
      <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow><TableHead>School</TableHead><TableHead>Contact</TableHead><TableHead>Status</TableHead><TableHead>Booth</TableHead><TableHead>Check-in</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{filteredExhibitors.map((ex) => (<TableRow key={ex.id}><TableCell><div><div className="font-medium">{ex.school_name}</div><div className="text-sm text-gray-500">{ex.contact_name}</div></div></TableCell><TableCell><div className="text-sm"><div>{ex.contact_email}</div><div className="text-gray-500">{ex.phone}</div></div></TableCell><TableCell>{getStatusBadge(ex.status)}</TableCell><TableCell>{ex.booth_number ? <Badge variant="outline">{ex.booth_number}</Badge> : <Input placeholder="Assign" className="w-20 h-8 text-xs" onBlur={(e) => handleAssignBooth(ex.id, e.target.value)} />}</TableCell><TableCell>{ex.checked_in ? <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Checked In</Badge> : <Button size="sm" variant="outline" onClick={() => handleCheckIn('exhibitor', ex.id)}>Check In</Button>}</TableCell><TableCell><div className="flex gap-2">{ex.status === 'pending' && ex.payment_method === 'bank' && (<Button size="sm" onClick={() => handleUpdateStatus(ex.id, 'paid')}>Mark Paid</Button>)}</div></TableCell></TableRow>))}</TableBody></Table></div>
    </div>
  );

  const StudentsTab = () => (
    <div className="space-y-4">
      <div className="flex gap-4 items-center"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div><Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export CSV</Button></div>
      <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Check-in</TableHead><TableHead>Registered</TableHead></TableRow></TableHeader><TableBody>{filteredStudents.map((s) => (<TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.email}</TableCell><TableCell><Badge className={s.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{s.status}</Badge></TableCell><TableCell>{s.checked_in ? <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Checked In</Badge> : <Button size="sm" variant="outline" onClick={() => handleCheckIn('student', s.id)}>Check In</Button>}</TableCell><TableCell>{format(new Date(s.created_date), 'MMM dd, yyyy')}</TableCell></TableRow>))}</TableBody></Table></div>
    </div>
  );

  const CheckInTab = () => (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="w-5 h-5" />QR Code Check-in</CardTitle></CardHeader><CardContent><div className="text-center py-12 bg-gray-50 rounded-lg"><QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-600">QR Scanner integration for real-time check-ins would be active here.</p></div></CardContent></Card>
      <div className="grid md:grid-cols-2 gap-6"><Card><CardHeader><CardTitle>Check-in Statistics</CardTitle></CardHeader><CardContent><div className="space-y-3"><div className="flex justify-between"><span>Exhibitors Checked In:</span><Badge>{exhibitors.filter(e => e.checked_in).length} / {exhibitors.length}</Badge></div><div className="flex justify-between"><span>Students Checked In:</span><Badge>{students.filter(s => s.checked_in).length} / {students.length}</Badge></div></div></CardContent></Card></div>
    </div>
  );
  
  const SettingsTab = () => (
      <Card><CardHeader><CardTitle>Event Settings</CardTitle></CardHeader><CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
              <div><Label htmlFor="nasio_checkout_url">Nas.io Checkout URL</Label><Input id="nasio_checkout_url" value={eventSettings.nasio_checkout_url || ''} onChange={(e) => handleSettingsChange('nasio_checkout_url', e.target.value)} /></div>
              <div><Label htmlFor="registration_close">Registration Deadline</Label><Input id="registration_close" type="date" value={eventSettings.registration_close || ''} onChange={(e) => handleSettingsChange('registration_close', e.target.value)} /></div>
              <div><Label htmlFor="refund_50_by">50% Refund Deadline</Label><Input id="refund_50_by" type="date" value={eventSettings.refund_50_by || ''} onChange={(e) => handleSettingsChange('refund_50_by', e.target.value)} /></div>
              <div><Label htmlFor="archive_at">Archive Date</Label><Input id="archive_at" type="datetime-local" value={eventSettings.archive_at?.substring(0,16) || ''} onChange={(e) => handleSettingsChange('archive_at', e.target.value)} /></div>
          </div>
          <div>
              <h4 className="font-medium mb-2">Bank Transfer Details</h4>
              <div className="grid md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                  <div><Label>Bank Name</Label><Input value={eventSettings.bank_details?.bank_name || ''} onChange={(e) => handleBankDetailsChange('bank_name', e.target.value)} /></div>
                  <div><Label>Account Name</Label><Input value={eventSettings.bank_details?.account_name || ''} onChange={(e) => handleBankDetailsChange('account_name', e.target.value)} /></div>
                  <div><Label>Account Number</Label><Input value={eventSettings.bank_details?.account_number || ''} onChange={(e) => handleBankDetailsChange('account_number', e.target.value)} /></div>
                  <div><Label>SWIFT Code</Label><Input value={eventSettings.bank_details?.swift_code || ''} onChange={(e) => handleBankDetailsChange('swift_code', e.target.value)} /></div>
              </div>
          </div>
          <Button onClick={handleSaveSettings} className="bg-emerald-600 hover:bg-emerald-700">Save Settings</Button>
      </CardContent></Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl font-bold">{event.title} - Admin Dashboard</DialogTitle></DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="exhibitors" className="flex items-center gap-2"><Building className="w-4 h-4" />Exhibitors ({exhibitors.length})</TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2"><Users className="w-4 h-4" />Students ({students.length})</TabsTrigger>
            <TabsTrigger value="checkin" className="flex items-center gap-2"><QrCode className="w-4 h-4" />Check-in</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2"><Settings className="w-4 h-4" />Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="exhibitors"><ExhibitorsTab /></TabsContent>
          <TabsContent value="students"><StudentsTab /></TabsContent>
          <TabsContent value="checkin"><CheckInTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}