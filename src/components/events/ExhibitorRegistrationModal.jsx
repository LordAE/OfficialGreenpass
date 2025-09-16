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
  DollarSign,
  Building
} from 'lucide-react';
import { EventRegistration } from '@/api/entities';
import { format } from 'date-fns';

export default function ExhibitorRegistrationModal({ open, onOpenChange, event, user }) {
  const [activeTab, setActiveTab] = useState('card');
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

  const handleCardPayment = async () => {
    if (!isFormValid()) return;
    window.open(event.nasio_checkout_url, '_blank');
    await createRegistration('card', 'pending_payment');
  };

  const handlePayPalPayment = async () => {
    if (!isFormValid()) return;
    window.open(event.nasio_checkout_url + '?method=paypal', '_blank');
    await createRegistration('paypal', 'pending_payment');
  };

  const handleBankTransfer = async () => {
    if (!isFormValid() || !bankProofFile) return;
    setLoading(true);
    try {
      const bankProofUrl = 'https://example.com/bank-proof.jpg'; // Placeholder
      await createRegistration('bank_transfer', 'pending_payment', bankProofUrl);
    } catch (error) {
      console.error('Bank transfer error:', error);
    }
    setLoading(false);
  };

  const createRegistration = async (paymentMethod, status, bankProofUrl = null) => {
    try {
      const holdExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const reservationCode = `EVT${Date.now().toString().slice(-6)}`;
      
      const newReg = {
        user_id: user.id,
        event_id: event.event_id,
        role: 'school',
        reservation_code: reservationCode,
        contact_name: formData.contactName,
        contact_email: formData.contactEmail,
        phone: formData.phone,
        organization_name: formData.schoolName,
        amount_usd: 950,
        amount_vnd: 950 * 25450, // Default FX rate
        fx_rate: 25450,
        status: status,
        payment_method: paymentMethod,
        proof_url: bankProofUrl,
        hold_expires_at: holdExpiresAt.toISOString(),
        ticket_qr_url: status === 'paid' ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${event.event_id}-EXHIBITOR-${user.id}` : null,
      };
      
      const registration = await EventRegistration.create(newReg);
      onOpenChange(false);
    } catch (error) {
      console.error('Registration creation error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">GAIN Fair 2025 - Exhibitor Booth</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-emerald-50 to-blue-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building className="w-5 h-5 text-emerald-600" />
                    Exhibitor Booth Registration
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-600">$950</div>
                  <div className="text-sm text-gray-500">USD</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  50% refund until October 10, 2025
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  No refunds after October 10, 2025
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Closes October 15, 2025
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Institution Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schoolName">Institution Name *</Label>
                <Input 
                  id="schoolName" 
                  placeholder="University of Example" 
                  value={formData.schoolName} 
                  onChange={(e) => handleInputChange('schoolName', e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input 
                  id="contactName" 
                  placeholder="John Doe" 
                  value={formData.contactName} 
                  onChange={(e) => handleInputChange('contactName', e.target.value)} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input 
                  id="contactEmail" 
                  type="email" 
                  placeholder="contact@university.edu" 
                  value={formData.contactEmail} 
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input 
                  id="phone" 
                  placeholder="+1 (555) 123-4567" 
                  value={formData.phone} 
                  onChange={(e) => handleInputChange('phone', e.target.value)} 
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="card">Card</TabsTrigger>
                <TabsTrigger value="paypal">PayPal</TabsTrigger>
                <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
              </TabsList>
              
              <TabsContent value="card" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-4">Pay securely with card via Stripe.</p>
                    <Button 
                      onClick={handleCardPayment} 
                      disabled={!isFormValid()} 
                      className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Pay $950 with Card
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="paypal" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-4">Pay using your PayPal account.</p>
                    <Button 
                      onClick={handlePayPalPayment} 
                      disabled={!isFormValid()} 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Pay $950 with PayPal
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="bank" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <p className="text-sm text-gray-600">Transfer the amount to our bank account and upload proof.</p>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                      <div><strong>Bank:</strong> GreenPass Bank</div>
                      <div><strong>Account:</strong> 123-456-7890</div>
                      <div><strong>Name:</strong> GreenPass Events Ltd</div>
                      <div><strong>SWIFT:</strong> GPEVVNVX</div>
                      <div><strong>Amount:</strong> $950 USD</div>
                    </div>
                    <div>
                      <Label htmlFor="bankProof">Upload Payment Proof *</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <Input 
                          id="bankProof" 
                          type="file" 
                          accept="image/*,application/pdf" 
                          onChange={(e) => setBankProofFile(e.target.files[0])} 
                        />
                        <Upload className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    <Button 
                      onClick={handleBankTransfer} 
                      disabled={!isFormValid() || !bankProofFile || loading} 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {loading ? 'Processing...' : 'Submit Bank Transfer'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}