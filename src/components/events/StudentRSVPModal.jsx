import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { StudentRSVP } from '@/api/entities';
import { format } from 'date-fns';

export default function StudentRSVPModal({ open, onOpenChange, event, user, onRSVPComplete }) {
  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    email: user?.email || ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return formData.name.trim() && formData.email.trim();
  };

  const handleRSVP = async () => {
    if (!isFormValid()) return;
    setLoading(true);
    try {
      const rsvp = await StudentRSVP.create({
        event_id: event.event_id,
        user_id: user.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        status: 'confirmed',
        ticket_qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${event.event_id}-STUDENT-${user.id}`,
        checked_in: false
      });
      onRSVPComplete(rsvp);
      onOpenChange(false);
    } catch (error) {
      console.error('RSVP error:', error);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            <Sparkles className="w-6 h-6 inline mr-2 text-emerald-600" />
            Free Student RSVP
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                <Badge className="bg-green-100 text-green-800 px-3 py-1 text-sm font-medium">✨ Completely FREE for Students</Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-emerald-600" /><span>{format(new Date(event.start), 'MMMM dd, yyyy')}</span></div>
                <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-emerald-600" /><span>{format(new Date(event.start), 'HH:mm')} – {format(new Date(event.end), 'HH:mm')}</span></div>
                <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-emerald-600" /><span>{event.location}</span></div>
                <div className="flex items-center gap-3"><Users className="w-4 h-4 text-emerald-600" /><span>Meet 50+ international schools</span></div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2 text-sm">
            {[
              'Free admission to all exhibition areas',
              'Access to 50+ university representatives', 
              'Scholarship information sessions',
              'Visa guidance workshops'
            ].map((item, idx) => <div key={idx} className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" /><span className="text-gray-600">{item}</span></div>)}
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Confirm Your Details:</h4>
            <div>
              <Label htmlFor="studentName">Full Name *</Label>
              <Input id="studentName" placeholder="Enter your full name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="studentEmail">Email Address *</Label>
              <Input id="studentEmail" type="email" placeholder="Enter your email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">We'll send your digital ticket to this email</p>
            </div>
          </div>
          <Button onClick={handleRSVP} disabled={!isFormValid() || loading} className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white py-3 text-lg font-semibold">
            {loading ? 'Creating Your Ticket...' : <><CheckCircle className="w-5 h-5 mr-2" />Confirm Free RSVP</>}
          </Button>
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg text-center"><p>By registering, you agree to receive event updates.</p></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}