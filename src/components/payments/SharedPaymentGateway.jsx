import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Building, Send, Upload, FileText, Loader2, CheckCircle } from 'lucide-react';
import { BankSettings } from '@/api/entities';
import { UploadFile } from '@/api/integrations';

// PayPal Payment Component
const PayPalPayment = ({ amount, onSuccess, onError }) => {
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  useEffect(() => {
    if (window.paypal) {
      setPaypalLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = "https://www.paypal.com/sdk/js?client-id=sandbox&currency=USD";
    script.onload = () => setPaypalLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (paypalLoaded && window.paypal) {
      window.paypal.Buttons({
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: amount.toString()
              }
            }]
          });
        },
        onApprove: async (data, actions) => {
          const details = await actions.order.capture();
          onSuccess(details);
        },
        onError: (err) => {
          console.error('PayPal error:', err);
          onError(err);
        }
      }).render('#paypal-button-container');
    }
  }, [paypalLoaded, amount, onSuccess, onError]);

  return (
    <div className="space-y-4">
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertDescription>
          Pay securely with PayPal or your credit/debit card. You'll be redirected to complete the payment.
        </AlertDescription>
      </Alert>
      
      {paypalLoaded ? (
        <div id="paypal-button-container"></div>
      ) : (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading PayPal...
        </div>
      )}
    </div>
  );
};

const BankTransferDetails = ({ bankDetails }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        <Building className="w-5 h-5 text-gray-600" />
        Bank Transfer Instructions
      </CardTitle>
      <CardDescription>
        Please use the following details to complete your transfer.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3 text-sm">
        {bankDetails.beneficiary_name && <p><strong>Beneficiary Name:</strong> {bankDetails.beneficiary_name}</p>}
        {bankDetails.beneficiary_address && <p><strong>Beneficiary Address:</strong> {bankDetails.beneficiary_address}</p>}
        {bankDetails.bank_name && <p><strong>Bank Name:</strong> {bankDetails.bank_name}</p>}
        {bankDetails.branch_address && <p><strong>Bank Address:</strong> {bankDetails.branch_address}</p>}
        {bankDetails.account_number && <p><strong>Account Number:</strong> {bankDetails.account_number}</p>}
        {bankDetails.institution_number && <p><strong>Institution Number:</strong> {bankDetails.institution_number}</p>}
        {bankDetails.branch_transit && <p><strong>Branch/Transit Number:</strong> {bankDetails.branch_transit}</p>}
        {bankDetails.swift_bic && <p><strong>SWIFT/BIC Code:</strong> {bankDetails.swift_bic}</p>}
        {bankDetails.currency && <p><strong>Currency:</strong> {bankDetails.currency}</p>}
        {bankDetails.charges_option && <p><strong>Charges:</strong> {bankDetails.charges_option} (sender pays all fees)</p>}
        <p className="font-bold text-red-600">
          Important: Please include your reservation code <strong>{bankDetails.reservationCode}</strong> in the transfer reference/notes.
        </p>
        {bankDetails.instructions && <p className="mt-2 text-xs text-gray-500">{bankDetails.instructions}</p>}
      </div>
    </CardContent>
  </Card>
);

export default function SharedPaymentGateway({ 
  amountUSD,
  amountCAD, 
  itemDescription,
  relatedEntityId,
  relatedEntityType = 'event_registration',
  onCardPaymentSuccess,
  onBankTransferInitiated,
  onProcessing,
  payerName,
  payerEmail,
  onError
}) {
  const finalAmountUSD = amountUSD || 0;
  const finalAmountCAD = amountCAD || (finalAmountUSD * 1.35);
  const finalDescription = itemDescription || 'Payment';
  const finalEntityId = relatedEntityId;
  const finalEntityType = relatedEntityType;
  
  const [selectedMethod, setSelectedMethod] = useState('paypal');
  const [bankSettings, setBankSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferSubmissionError, setTransferSubmissionError] = useState('');
  const [etransferSubmitting, setEtransferSubmitting] = useState(false);
  const [etransferSubmissionError, setEtransferSubmissionError] = useState('');

  const [transferDetails, setTransferDetails] = useState({
    receipt: null,
    referenceCode: '',
    additionalInfo: ''
  });
  const [etransferDetails, setEtransferDetails] = useState({
    receipt: null,
    referenceCode: '',
    additionalInfo: ''
  });
  const [selectedBankAccountId, setSelectedBankAccountId] = useState(null);

  const bankFileInputRef = useRef(null);
  const etransferFileInputRef = useRef(null);

  useEffect(() => {
    const loadBankSettings = async () => {
      try {
        const settings = await BankSettings.filter({ active: true });
        setBankSettings(settings || []);
        if (settings && settings.filter && settings.filter(s => s.payment_type === 'bank_transfer' && s.active).length > 0) {
          setSelectedBankAccountId(settings.find(s => s.payment_type === 'bank_transfer' && s.active)?.id || null);
        }
      } catch (error) {
        console.error('Error loading bank settings:', error);
        setBankSettings([]);
      } finally {
        setLoading(false);
      }
    };
    loadBankSettings();
  }, []);

  useEffect(() => {
    if (selectedMethod === 'bank_transfer' && selectedBankAccountId && !transferDetails.referenceCode) {
      setTransferDetails(prev => ({ ...prev, referenceCode: `BANK_${Date.now()}` }));
    } else if (selectedMethod !== 'bank_transfer' && transferDetails.referenceCode) {
      setTransferDetails(prev => ({ ...prev, referenceCode: '' }));
    }
  }, [selectedMethod, selectedBankAccountId, transferDetails.referenceCode]);

  const uploadFileWithRetry = async (file, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await UploadFile({ file });
        return result;
      } catch (error) {
        console.error(`File upload attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        const waitTime = Math.pow(2, attempt) * 1000;
        throw { type: 'retryable_upload_error', message: `Upload attempt ${attempt} failed, retrying in ${waitTime/1000} seconds...`, waitTime: waitTime };
      }
    }
  };

  const handlePayPalSuccess = async (details) => {
    try {
      if (onProcessing && typeof onProcessing === 'function') {
        onProcessing();
      }
      if (onCardPaymentSuccess && typeof onCardPaymentSuccess === 'function') {
        const payerEmailAddress = details?.payer?.email_address || '';
        const payerFirstName = details?.payer?.name?.given_name || '';
        const payerLastName = details?.payer?.name?.surname || '';
        const payerFullName = `${payerFirstName} ${payerLastName}`.trim() || 'Unknown';
        
        onCardPaymentSuccess('paypal', details.id, {
          orderId: details.id,
          captureId: details?.purchase_units?.[0]?.payments?.captures?.[0]?.id || '',
          payerEmail: payerEmailAddress,
          payerName: payerFullName
        });
      }
    } catch (error) {
      console.error('Error processing PayPal payment:', error);
      if (onError && typeof onError === 'function') {
        onError(error);
      } else {
        alert('Payment was successful but failed to save. Please contact support.');
      }
    }
  };

  const handleBankTransferSubmit = async () => {
    if (!selectedBankAccountId) {
      setTransferSubmissionError('Please select a bank account to transfer to.');
      return;
    }
    if (!transferDetails.receipt) {
      setTransferSubmissionError('Please upload your payment receipt.');
      return;
    }
    if (!transferDetails.referenceCode.trim()) {
      setTransferSubmissionError('A reference code could not be generated. Please try again or contact support.');
      return;
    }

    setTransferSubmitting(true);
    setTransferSubmissionError('');
    if (onProcessing && typeof onProcessing === 'function') {
      onProcessing();
    }

    try {
      setTransferSubmissionError('Uploading receipt file... This may take a moment.');
      
      let uploadResult;
      try {
        uploadResult = await uploadFileWithRetry(transferDetails.receipt);
      } catch (uploadError) {
        if (uploadError.type === 'retryable_upload_error') {
          setTransferSubmissionError(uploadError.message);
          await new Promise(resolve => setTimeout(resolve, uploadError.waitTime));
          uploadResult = await uploadFileWithRetry(transferDetails.receipt);
        } else {
          throw uploadError;
        }
      }
      
      if (!uploadResult?.file_url) {
        throw new Error('Failed to get file URL from upload');
      }

      setTransferSubmissionError('Processing payment submission...');
      
      const selectedBank = bankSettings.find(b => b.id === selectedBankAccountId);
      
      if (onBankTransferInitiated && typeof onBankTransferInitiated === 'function') {
        await onBankTransferInitiated(
          'bank_transfer',
          uploadResult.file_url,
          transferDetails.referenceCode,
          transferDetails.additionalInfo,
          selectedBank
        );
      }

      setTransferDetails({
        receipt: null,
        referenceCode: '',
        additionalInfo: ''
      });
      setTransferSubmissionError('Bank transfer submitted successfully.');
      
    } catch (error) {
      console.error('Bank transfer submission error:', error);
      
      let errorMessage = 'Failed to submit bank transfer. Please try again.';
      
      if (error.message?.includes('timeout') || error.message?.includes('DatabaseTimeout')) {
        errorMessage = 'Upload timed out due to server load. Please wait a moment and try again with a smaller file if possible.';
      } else if (error.message?.includes('file URL')) {
        errorMessage = 'File upload completed but processing failed. Please try again.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setTransferSubmissionError(errorMessage);
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleETransferSubmit = async () => {
    if (!etransferDetails.receipt) {
      setEtransferSubmissionError('Please upload your e-transfer confirmation screenshot.');
      return;
    }

    if (!etransferDetails.additionalInfo.trim()) {
      setEtransferSubmissionError('Please provide details about your e-transfer.');
      return;
    }

    setEtransferSubmitting(true);
    setEtransferSubmissionError('');
    if (onProcessing && typeof onProcessing === 'function') {
      onProcessing();
    }

    try {
      setEtransferSubmissionError('Uploading confirmation... This may take a moment.');
      
      let uploadResult;
      try {
        uploadResult = await uploadFileWithRetry(etransferDetails.receipt);
      } catch (uploadError) {
        if (uploadError.type === 'retryable_upload_error') {
          setEtransferSubmissionError(uploadError.message);
          await new Promise(resolve => setTimeout(resolve, uploadError.waitTime));
          uploadResult = await uploadFileWithRetry(etransferDetails.receipt);
        } else {
          throw uploadError;
        }
      }
      
      if (!uploadResult?.file_url) {
        throw new Error('Failed to get file URL from upload');
      }

      setEtransferSubmissionError('Processing payment submission...');
      
      const referenceCode = `ETRANSFER_${Date.now()}`;
      const etransferSetting = bankSettings.find(s => s.payment_type === 'etransfer' && s.active);

      if (onBankTransferInitiated && typeof onBankTransferInitiated === 'function') {
        await onBankTransferInitiated(
          'etransfer',
          uploadResult.file_url,
          referenceCode,
          etransferDetails.additionalInfo,
          etransferSetting
        );
      }

      setEtransferDetails({
        receipt: null,
        referenceCode: '',
        additionalInfo: ''
      });
      setEtransferSubmissionError('E-Transfer submitted successfully.');

    } catch (error) {
      console.error('E-transfer submission error:', error);
      
      let errorMessage = 'Failed to submit e-transfer. Please try again.';
      
      if (error.message?.includes('timeout') || error.message?.includes('DatabaseTimeout')) {
        errorMessage = 'Upload timed out due to server load. Please wait a moment and try again with a smaller file if possible.';
      } else if (error.message?.includes('file URL')) {
        errorMessage = 'File upload completed but processing failed. Please try again.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setEtransferSubmissionError(errorMessage);
    } finally {
      setEtransferSubmitting(false);
    }
  };

  const handleFileSelect = (event, type) => {
    const file = event.target.files[0];
    if (file) {
      if (type === 'bank') {
        setTransferDetails(prev => ({ ...prev, receipt: file }));
      } else if (type === 'etransfer') {
        setEtransferDetails(prev => ({ ...prev, receipt: file }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2">Loading payment options...</span>
      </div>
    );
  }

  const bankTransferSettings = (bankSettings && bankSettings.filter) ? bankSettings.filter(s => s.payment_type === 'bank_transfer' && s.active) : [];
  const etransferSettings = (bankSettings && bankSettings.find) ? bankSettings.find(s => s.payment_type === 'etransfer' && s.active) : null;
  const selectedBank = (bankTransferSettings && bankTransferSettings.find) ? bankTransferSettings.find(b => b.id === selectedBankAccountId) : null;

  const validAmount = finalAmountUSD;
  const cadAmount = finalAmountCAD;

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>Payment Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <span className="text-lg">{finalDescription}</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">${validAmount.toFixed(2)} USD</div>
            <div className="text-sm text-gray-500">CAD Equivalent: ${cadAmount.toFixed(2)}</div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Select Payment Method</h3>
          <Tabs value={selectedMethod} onValueChange={setSelectedMethod} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="paypal" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                PayPal
              </TabsTrigger>
              <TabsTrigger value="bank_transfer" className="flex items-center gap-2" disabled={!bankTransferSettings.length}>
                <Building className="w-4 h-4" />
                Bank Transfer
              </TabsTrigger>
              <TabsTrigger value="etransfer" className="flex items-center gap-2" disabled={!etransferSettings}>
                <Send className="w-4 h-4" />
                E-Transfer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paypal" className="space-y-4">
              <PayPalPayment
                amount={validAmount}
                onSuccess={handlePayPalSuccess}
                onError={(err) => {
                  console.error('PayPal error:', err);
                  if (onError && typeof onError === 'function') {
                    onError(err);
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="bank_transfer" className="space-y-4">
              {bankTransferSettings.length > 0 ? (
                <>
                  <Alert>
                    <Building className="h-4 w-4" />
                    <AlertDescription>
                      Select an account, transfer the exact amount, and upload your receipt for verification.
                    </AlertDescription>
                  </Alert>

                  <RadioGroup value={selectedBankAccountId} onValueChange={setSelectedBankAccountId} className="space-y-4">
                    <Label className="font-semibold">Select Bank Account to Transfer To:</Label>
                    {bankTransferSettings.map((bank) => (
                      <div key={bank.id} className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 has-[[data-state=checked]]:border-blue-500 has-[[data-state=checked]]:bg-blue-50">
                        <RadioGroupItem value={bank.id} id={bank.id} />
                        <Label htmlFor={bank.id} className="flex-grow cursor-pointer">
                          <div className="font-semibold text-base">{bank.account_nickname} ({bank.currency})</div>
                          <div className="text-sm text-gray-600">{bank.bank_name} - *********{bank.account_number.slice(-4)}</div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  
                  {selectedBank && (
                    <BankTransferDetails
                      bankDetails={{
                        ...selectedBank,
                        reservationCode: transferDetails.referenceCode,
                      }}
                    />
                  )}

                  <div className="space-y-4 pt-4">
                    <Label htmlFor="bank-receipt">Upload Payment Receipt</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        ref={bankFileInputRef}
                        type="file"
                        id="bank-receipt"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileSelect(e, 'bank')}
                        className="hidden"
                      />
                      {transferDetails.receipt ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span>Receipt selected: {transferDetails.receipt.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-2">Click button to upload your receipt</p>
                          <p className="text-sm text-gray-500">Supports JPG, PNG, PDF files</p>
                        </div>
                      )}
                    </div>
                     <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => bankFileInputRef.current?.click()}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        {transferDetails.receipt ? 'Change Receipt' : 'Select Receipt File'}
                    </Button>

                    {transferSubmissionError && (
                      <div className={`mt-4 p-3 rounded-md ${transferSubmissionError.includes('successfully') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className="text-sm text-red-600">{transferSubmissionError}</p>
                        {transferSubmissionError.includes('timeout') && (
                          <div className="mt-2 text-xs text-red-500">
                            <p>Tips for resolving timeout errors:</p>
                            <ul className="list-disc list-inside mt-1">
                              <li>Try uploading a smaller image file (compress if needed)</li>
                              <li>Check your internet connection</li>
                              <li>Wait a few minutes and try again</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <Button 
                      onClick={handleBankTransferSubmit} 
                      disabled={!transferDetails.receipt || transferSubmitting || !selectedBankAccountId || !transferDetails.referenceCode}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {transferSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {transferSubmissionError.includes('Uploading') || transferSubmissionError.includes('Processing') ? transferSubmissionError : 'Submitting...'}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit Bank Transfer
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    Bank transfer is not currently available. Please contact support or choose another payment method.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="etransfer" className="space-y-4">
              {etransferSettings ? (
                <>
                  <Alert>
                    <Send className="h-4 w-4" />
                    <AlertDescription>
                      Follow the instructions below to send an e-transfer and upload your confirmation screenshot.
                    </AlertDescription>
                  </Alert>

                  {etransferSettings.instructions && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-semibold mb-3 text-green-800">E-Transfer Instructions</h4>
                          <div 
                              className="prose prose-sm max-w-none" 
                              dangerouslySetInnerHTML={{ __html: etransferSettings.instructions }}
                          />
                      </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="etransfer-details">E-Transfer Details</Label>
                      <Textarea
                        id="etransfer-details"
                        value={etransferDetails.additionalInfo}
                        onChange={(e) => setEtransferDetails(prev => ({ ...prev, additionalInfo: e.target.value }))}
                        placeholder="Please provide any additional details about your e-transfer (optional)"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="etransfer-receipt">Upload Confirmation Screenshot</Label>
                       <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                            ref={etransferFileInputRef}
                            type="file"
                            id="etransfer-receipt"
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e, 'etransfer')}
                            className="hidden"
                        />
                        {etransferDetails.receipt ? (
                          <div className="flex items-center justify-center gap-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span>Screenshot selected: {etransferDetails.receipt.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-2">Click button to upload confirmation</p>
                            <p className="text-sm text-gray-500">Screenshot from your banking app or email</p>
                          </div>
                        )}
                       </div>
                       <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full mt-2"
                          onClick={() => etransferFileInputRef.current?.click()}
                      >
                          <Upload className="w-4 h-4 mr-2" />
                          {etransferDetails.receipt ? 'Change Screenshot' : 'Select Screenshot'}
                      </Button>
                    </div>

                    {etransferSubmissionError && (
                      <div className={`mt-4 p-3 rounded-md ${etransferSubmissionError.includes('successfully') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className="text-sm text-red-600">{etransferSubmissionError}</p>
                        {etransferSubmissionError.includes('timeout') && (
                          <div className="mt-2 text-xs text-red-500">
                            <p>Tips for resolving timeout errors:</p>
                            <ul className="list-disc list-inside mt-1">
                              <li>Try uploading a smaller image file (compress if needed)</li>
                              <li>Check your internet connection</li>
                              <li>Wait a few minutes and try again</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <Button 
                      onClick={handleETransferSubmit} 
                      disabled={!etransferDetails.receipt || etransferSubmitting}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {etransferSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {etransferSubmissionError.includes('Uploading') || etransferSubmissionError.includes('Processing') ? etransferSubmissionError : 'Submitting...'}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit E-Transfer
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    E-transfer is not currently available. Please contact support or choose another payment method.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}