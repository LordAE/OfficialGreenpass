
import React, { useState, useEffect } from 'react';
import { BankSettings } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Plus, Edit, Trash2, Eye, EyeOff, CreditCard, Building, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from "@/components/ui/badge"; // Added for inactive status

const BankAccountForm = ({ initialData, onSave, onCancel, saving }) => {
  const [formData, setFormData] = useState({
    account_nickname: initialData?.account_nickname || '',
    country: initialData?.country || 'Canada',
    beneficiary_name: initialData?.beneficiary_name || '',
    beneficiary_address: initialData?.beneficiary_address || '',
    bank_name: initialData?.bank_name || '',
    branch_address: initialData?.branch_address || '',
    account_number: initialData?.account_number || '',
    branch_transit: initialData?.branch_transit || '',
    institution_number: initialData?.institution_number || '',
    swift_bic: initialData?.swift_bic || '',
    currency: initialData?.currency || 'USD',
    charges_option: initialData?.charges_option || 'OUR',
    instructions: initialData?.instructions || '',
    active: initialData?.active ?? false,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
      <div>
        <Label htmlFor="account_nickname">Account Nickname</Label>
        <Input
          id="account_nickname"
          value={formData.account_nickname}
          onChange={(e) => handleChange('account_nickname', e.target.value)}
          placeholder="e.g., Main CAD Account"
          required
        />
        <p className="text-xs text-gray-500 mt-1">A name to help you identify this account.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="bank_country">Country</Label>
          <Select value={formData.country} onValueChange={(value) => handleChange('country', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Canada">Canada</SelectItem>
              <SelectItem value="United States">United States</SelectItem>
              <SelectItem value="United Kingdom">United Kingdom</SelectItem>
              <SelectItem value="Vietnam">Vietnam</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="bank_currency">Currency</Label>
          <Select value={formData.currency} onValueChange={(value) => handleChange('currency', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="VND">VND</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="beneficiary_name">Beneficiary Name</Label>
        <Input id="beneficiary_name" value={formData.beneficiary_name} onChange={(e) => handleChange('beneficiary_name', e.target.value)} placeholder="GreenPass Group Inc." />
      </div>

      <div>
        <Label htmlFor="beneficiary_address">Beneficiary Address</Label>
        <Textarea id="beneficiary_address" value={formData.beneficiary_address} onChange={(e) => handleChange('beneficiary_address', e.target.value)} placeholder="123 Main Street, City, Province, Postal Code" rows={2} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="bank_name">Bank Name</Label>
          <Input id="bank_name" value={formData.bank_name} onChange={(e) => handleChange('bank_name', e.target.value)} placeholder="Royal Bank of Canada" />
        </div>
        <div>
          <Label htmlFor="swift_bic">SWIFT/BIC Code</Label>
          <Input id="swift_bic" value={formData.swift_bic} onChange={(e) => handleChange('swift_bic', e.target.value)} placeholder="ROYCCAT2" />
        </div>
      </div>

      <div>
        <Label htmlFor="branch_address">Branch Address</Label>
        <Textarea id="branch_address" value={formData.branch_address} onChange={(e) => handleChange('branch_address', e.target.value)} placeholder="456 Bank Street, City, Province" rows={2} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="account_number">Account Number</Label>
          <Input id="account_number" value={formData.account_number} onChange={(e) => handleChange('account_number', e.target.value)} placeholder="1234567890" />
        </div>
        <div>
          <Label htmlFor="branch_transit">Branch Transit</Label>
          <Input id="branch_transit" value={formData.branch_transit} onChange={(e) => handleChange('branch_transit', e.target.value)} placeholder="12345" />
        </div>
        <div>
          <Label htmlFor="institution_number">Institution Number</Label>
          <Input id="institution_number" value={formData.institution_number} onChange={(e) => handleChange('institution_number', e.target.value)} placeholder="003" />
        </div>
      </div>

      <div>
        <Label htmlFor="charges_option">Charges Option</Label>
        <Select value={formData.charges_option} onValueChange={(value) => handleChange('charges_option', value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OUR">OUR (You pay all charges)</SelectItem>
            <SelectItem value="SHA">SHA (Shared charges)</SelectItem>
            <SelectItem value="BEN">BEN (Beneficiary pays all charges)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">Who pays for the transfer charges.</p>
      </div>

      <div>
        <Label htmlFor="bank_instructions">Wire Transfer Instructions</Label>
        <Textarea id="bank_instructions" value={formData.instructions} onChange={(e) => handleChange('instructions', e.target.value)} placeholder="Please include your reservation code in the transfer memo..." rows={3} />
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="bank_active" checked={formData.active} onCheckedChange={(checked) => handleChange('active', checked)} />
        <Label htmlFor="bank_active">Enable this bank account</Label>
      </div>

      <DialogFooter className="sticky bottom-0 bg-white pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Account
        </Button>
      </DialogFooter>
    </form>
  );
};


export default function AdminBankSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('paypal');
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const bankSettings = await BankSettings.list();
      setSettings(bankSettings);
    } catch (error) {
      console.error("Error loading bank settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSettingsByType = (type) => {
    // This function now only handles single-instance settings like PayPal or E-transfer.
    // Bank transfer will be handled by filtering the settings array.
    return settings.find(s => s.payment_type === type) || {
      payment_type: type,
      country: '',
      active: false
    };
  };

  const updateSetting = async (type, data) => {
    setSaving(true);
    try {
      const existing = settings.find(s => s.payment_type === type);
      const settingData = { payment_type: type, ...data };
      
      if (existing) {
        await BankSettings.update(existing.id, settingData);
      } else {
        await BankSettings.create(settingData);
      }
      
      await loadSettings();
      alert('Settings saved successfully!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSecretVisibility = (key) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const PayPalSettings = () => {
    const paypalSettings = getSettingsByType('paypal');
    const [formData, setFormData] = useState({
      country: paypalSettings.country || 'Global',
      paypal_client_id: paypalSettings.paypal_client_id || '',
      paypal_client_secret: paypalSettings.paypal_client_secret || '',
      paypal_merchant_email: paypalSettings.paypal_merchant_email || '',
      paypal_webhook_url: paypalSettings.paypal_webhook_url || '',
      paypal_environment: paypalSettings.paypal_environment || 'sandbox',
      currency: paypalSettings.currency || 'USD',
      instructions: paypalSettings.instructions || '',
      active: paypalSettings.active || false
    });

    const handleSave = () => {
      updateSetting('paypal', formData);
    };

    return (
      <div className="space-y-6">
        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            Configure PayPal for secure payment processing. You'll need a PayPal Business account to get API credentials.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="paypal_environment">Environment</Label>
            <Select value={formData.paypal_environment} onValueChange={(value) => setFormData(prev => ({ ...prev, paypal_environment: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                <SelectItem value="live">Live (Production)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">Use sandbox for testing, live for production</p>
          </div>

          <div>
            <Label htmlFor="paypal_currency">Currency</Label>
            <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="paypal_client_id">PayPal Client ID</Label>
          <Input
            id="paypal_client_id"
            value={formData.paypal_client_id}
            onChange={(e) => setFormData(prev => ({ ...prev, paypal_client_id: e.target.value }))}
            placeholder="Enter your PayPal Client ID"
          />
          <p className="text-xs text-gray-500 mt-1">Get this from your PayPal Developer Dashboard</p>
        </div>

        <div>
          <Label htmlFor="paypal_client_secret">PayPal Client Secret</Label>
          <div className="relative">
            <Input
              id="paypal_client_secret"
              type={showSecrets.paypal_secret ? 'text' : 'password'}
              value={formData.paypal_client_secret}
              onChange={(e) => setFormData(prev => ({ ...prev, paypal_client_secret: e.target.value }))}
              placeholder="Enter your PayPal Client Secret"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => toggleSecretVisibility('paypal_secret')}
            >
              {showSecrets.paypal_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Keep this secret secure</p>
        </div>

        <div>
          <Label htmlFor="paypal_merchant_email">PayPal Business Email</Label>
          <Input
            id="paypal_merchant_email"
            type="email"
            value={formData.paypal_merchant_email}
            onChange={(e) => setFormData(prev => ({ ...prev, paypal_merchant_email: e.target.value }))}
            placeholder="business@yourcompany.com"
          />
          <p className="text-xs text-gray-500 mt-1">Your PayPal Business account email</p>
        </div>

        <div>
          <Label htmlFor="paypal_webhook_url">Webhook URL</Label>
          <Input
            id="paypal_webhook_url"
            value={formData.paypal_webhook_url}
            onChange={(e) => setFormData(prev => ({ ...prev, paypal_webhook_url: e.target.value }))}
            placeholder="https://yourdomain.com/api/paypal/webhook"
          />
          <p className="text-xs text-gray-500 mt-1">URL to receive PayPal payment notifications</p>
        </div>

        <div>
          <Label htmlFor="paypal_instructions">Payment Instructions</Label>
          <Textarea
            id="paypal_instructions"
            value={formData.instructions}
            onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
            placeholder="Additional instructions for PayPal payments..."
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="paypal_active"
            checked={formData.active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
          />
          <Label htmlFor="paypal_active">Enable PayPal payments</Label>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save PayPal Settings
        </Button>
      </div>
    );
  };

  const BankTransferSettings = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSetting, setEditingSetting] = useState(null);

    const bankAccounts = settings.filter(s => s.payment_type === 'bank_transfer');

    const handleEdit = (setting) => {
      setEditingSetting(setting);
      setIsFormOpen(true);
    };

    const handleAddNew = () => {
      setEditingSetting(null);
      setIsFormOpen(true);
    };

    const handleDelete = async (settingId) => {
      if (window.confirm('Are you sure you want to delete this bank account? This action cannot be undone.')) {
        setSaving(true);
        try {
          await BankSettings.delete(settingId);
          await loadSettings();
          alert('Bank account deleted successfully!');
        } catch (error) {
          console.error("Error deleting bank account:", error);
          alert('Failed to delete bank account.');
        } finally {
          setSaving(false);
        }
      }
    };
    
    const handleSave = async (formData) => {
      setSaving(true);
      try {
        const dataToSave = { payment_type: 'bank_transfer', ...formData };
        if (editingSetting && editingSetting.id) {
          await BankSettings.update(editingSetting.id, dataToSave);
        } else {
          await BankSettings.create(dataToSave);
        }
        setIsFormOpen(false);
        setEditingSetting(null);
        await loadSettings();
        alert('Bank account saved successfully!');
      } catch (error) {
        console.error("Error saving bank account:", error);
        alert('Failed to save bank account.');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <Alert className="flex-grow">
            <Building className="h-4 w-4" />
            <AlertDescription>
              Configure bank transfer details. You can add multiple accounts for different currencies or regions.
            </AlertDescription>
          </Alert>
          <Button onClick={handleAddNew} disabled={saving} className="flex-shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Add Bank Account
          </Button>
        </div>

        <div className="space-y-4">
          {bankAccounts.length > 0 ? (
            bankAccounts.map(account => (
              <Card key={account.id} className={`${!account.active && 'bg-gray-50 opacity-60'}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {account.account_nickname || 'Untitled Account'}
                        {!account.active && <Badge variant="outline">Inactive</Badge>}
                      </CardTitle>
                      <CardDescription>{account.bank_name} - {account.country} ({account.currency})</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(account)} disabled={saving}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(account.id)} disabled={saving}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-gray-500">No bank accounts configured yet.</p>
              <Button variant="link" onClick={handleAddNew}>Add your first bank account</Button>
            </div>
          )}
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSetting ? 'Edit Bank Account' : 'Add New Bank Account'}</DialogTitle>
              <DialogDescription>
                Provide the details for this bank transfer option.
              </DialogDescription>
            </DialogHeader>
            <BankAccountForm
              initialData={editingSetting}
              onSave={handleSave}
              onCancel={() => setIsFormOpen(false)}
              saving={saving}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const ETransferSettings = () => {
    const etransferSettings = getSettingsByType('etransfer');
    const [formData, setFormData] = useState({
      country: etransferSettings.country || 'Canada',
      etransfer_email: etransferSettings.etransfer_email || '',
      etransfer_security_question: etransferSettings.etransfer_security_question || '',
      etransfer_security_answer: etransferSettings.etransfer_security_answer || '',
      currency: etransferSettings.currency || 'CAD',
      instructions: etransferSettings.instructions || '',
      active: etransferSettings.active || false
    });

    const handleSave = () => {
      updateSetting('etransfer', formData);
    };

    return (
      <div className="space-y-6">
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription>
            Configure e-Transfer for Canadian domestic payments. This is only available for Canadian bank accounts.
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="etransfer_email">E-Transfer Email</Label>
          <Input
            id="etransfer_email"
            type="email"
            value={formData.etransfer_email}
            onChange={(e) => setFormData(prev => ({ ...prev, etransfer_email: e.target.value }))}
            placeholder="payments@greenpassgroup.com"
          />
          <p className="text-xs text-gray-500 mt-1">Email address to receive e-Transfers</p>
        </div>

        <div>
          <Label htmlFor="etransfer_security_question">Security Question</Label>
          <Input
            id="etransfer_security_question"
            value={formData.etransfer_security_question}
            onChange={(e) => setFormData(prev => ({ ...prev, etransfer_security_question: e.target.value }))}
            placeholder="What is the company name?"
          />
        </div>

        <div>
          <Label htmlFor="etransfer_security_answer">Security Answer</Label>
          <div className="relative">
            <Input
              id="etransfer_security_answer"
              type={showSecrets.etransfer_answer ? 'text' : 'password'}
              value={formData.etransfer_security_answer}
              onChange={(e) => setFormData(prev => ({ ...prev, etransfer_security_answer: e.target.value }))}
              placeholder="GreenPass"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => toggleSecretVisibility('etransfer_answer')}
            >
              {showSecrets.etransfer_answer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="etransfer_instructions">E-Transfer Instructions</Label>
          <Textarea
            id="etransfer_instructions"
            value={formData.instructions}
            onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
            placeholder="Please include your reservation code in the message field..."
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="etransfer_active"
            checked={formData.active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
          />
          <Label htmlFor="etransfer_active">Enable e-Transfer payments</Label>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save E-Transfer Settings
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Banking & Payment Settings</h1>
          <p className="text-gray-600 mt-2">Configure payment methods and banking details for your platform.</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="paypal" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  PayPal
                </TabsTrigger>
                <TabsTrigger value="bank_transfer" className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Bank Transfer
                </TabsTrigger>
                <TabsTrigger value="etransfer" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  E-Transfer
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paypal" className="mt-6">
                <PayPalSettings />
              </TabsContent>

              <TabsContent value="bank_transfer" className="mt-6">
                <BankTransferSettings />
              </TabsContent>

              <TabsContent value="etransfer" className="mt-6">
                <ETransferSettings />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
