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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Building2, 
  Upload, 
  ExternalLink, 
  AlertCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { ExhibitorRegistration } from '@/api/entities';
import { format } from 'date-fns';

export default function ExhibitorPaymentModal({ open, onOpenChange, event, user, onRegistrationComplete }) {
  const [activeTab, setActiveTab] = useState('stripe');
  const [formData, setFormData] = useState({
    schoolName: '',
    contactName: user?.full_name || '',
    contactEmail: user?.email || '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [bankProofFile, setBankProofFile] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return formData.schoolName && formData.contactName && formData.contactEmail && formData.phone;
  };

  const handleStripePayment = async () => {
    if (!isFormValid()) return;
    window.open(event.nasio_checkout_url, '_blank');
    await createRegistration('stripe', 'pending');
  };

  const handlePayPalPayment = async () => {
    if (!isFormValid()) return;
    window.open(event.nasio_checkout_url + '?method=paypal', '_blank');
    await createRegistration('paypal', 'pending');
  };

  const handleBankTransfer = async () => {
    if (!isFormValid() || !bankProofFile) return;
    setLoading(true);
    try {
      // In a real app, you'd upload the file first and get a URL
      const bankProofUrl = 'https://example.com/bank-proof.jpg'; // Placeholder
      await createRegistration('bank', 'pending', bankProofUrl);
    } catch (error) {
      console.error('Bank transfer error:', error);
    }
    setLoading(false);
  };

  const createRegistration = async (paymentMethod, status, bankProofUrl = null) => {
    try {
      const newReg = {
        event_id: event.event_id,
        user_id: user.id,
        school_name: formData.schoolName,
        contact_name: formData.contactName,
        contact_email: formData.contactEmail,
        phone: formData.phone,
        status: status,
        amount: event.price_usd,
        currency: 'USD',
        payment_method: paymentMethod,
        bank_proof_url: bankProofUrl,
        ticket_qr_url: status === 'paid' ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${event.event_id}-EXHIBITOR-${user.id}` : null,
        booth_number: null,
      };
      const registration = await ExhibitorRegistration.create(newReg);
      onRegistrationComplete(registration);
      onOpenChange(false);
    } catch (error) {
      console.error('Registration creation error:', error);
    }
  };

  const getRefundPolicy = () => {
    const refund50Date = format(new Date(event.refund_50_by), 'MMM dd');
    const refundNoneDate = format(new Date(event.refund_none_after), 'MMM dd');
    
    return [
      { label: '50% refund until', date: refund50Date },
      { label: 'No refunds after', date: refundNoneDate }
    ];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Exhibitor Registration</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-emerald-50 to-blue-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{event.title} - Exhibitor Booth</h3>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-600">${event.price_usd}</div>
                  <div className="text-sm text-gray-500">USD</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {getRefundPolicy().map((policy, idx) => (
                  <Badge key={idx} variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" />{policy.label} {policy.date}</Badge>
                ))}
                <Badge variant="outline" className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />Closes {format(new Date(event.registration_close), 'MMM dd')}</Badge>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Institution Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schoolName">Institution Name *</Label>
                <Input id="schoolName" placeholder="University of Example" value={formData.schoolName} onChange={(e) => handleInputChange('schoolName', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input id="contactName" placeholder="John Doe" value={formData.contactName} onChange={(e) => handleInputChange('contactName', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input id="contactEmail" type="email" placeholder="contact@university.edu" value={formData.contactEmail} onChange={(e) => handleInputChange('contactEmail', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" placeholder="+1 (555) 123-4567" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stripe" className="flex items-center gap-2"><CreditCard className="w-4 h-4" />Card</TabsTrigger>
                <TabsTrigger value="paypal" className="flex items-center gap-2"><DollarSign className="w-4 h-4" />PayPal</TabsTrigger>
                <TabsTrigger value="bank" className="flex items-center gap-2"><Building2 className="w-4 h-4" />Bank Transfer</TabsTrigger>
              </TabsList>
              <TabsContent value="stripe" className="mt-4"><Card><CardContent className="p-4"><p className="text-sm text-gray-600 mb-4">Pay securely with card via Stripe.</p><Button onClick={handleStripePayment} disabled={!isFormValid()} className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white"><ExternalLink className="w-4 h-4 mr-2" />Pay ${event.price_usd} with Card</Button></CardContent></Card></TabsContent>
              <TabsContent value="paypal" className="mt-4"><Card><CardContent className="p-4"><p className="text-sm text-gray-600 mb-4">Pay using your PayPal account.</p><Button onClick={handlePayPalPayment} disabled={!isFormValid()} className="w-full bg-blue-600 hover:bg-blue-700 text-white"><ExternalLink className="w-4 h-4 mr-2" />Pay ${event.price_usd} with PayPal</Button></CardContent></Card></TabsContent>
              <TabsContent value="bank" className="mt-4"><Card><CardContent className="p-4 space-y-4"><p className="text-sm text-gray-600">Transfer the amount to our bank account and upload proof.</p><div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm"><div><strong>Bank:</strong> {event.bank_details?.bank_name || 'N/A'}</div><div><strong>Account:</strong> {event.bank_details?.account_number || 'N/A'}</div><div><strong>Name:</strong> {event.bank_details?.account_name || 'N/A'}</div><div><strong>SWIFT:</strong> {event.bank_details?.swift_code || 'N/A'}</div><div><strong>Amount:</strong> ${event.price_usd} USD</div></div><div><Label htmlFor="bankProof">Upload Payment Proof *</Label><div className="mt-2 flex items-center gap-2"><Input id="bankProof" type="file" accept="image/*,application/pdf" onChange={(e) => setBankProofFile(e.target.files[0])} /><Upload className="w-4 h-4 text-gray-400" /></div></div><Button onClick={handleBankTransfer} disabled={!isFormValid() || !bankProofFile || loading} className="w-full bg-green-600 hover:bg-green-700 text-white">{loading ? 'Processing...' : 'Submit Bank Transfer'}</Button></CardContent></Card></TabsContent>
            </Tabs>
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg"><p>After payment, visit "My Registration" to sync your payment status and access your exhibitor materials.</p></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}