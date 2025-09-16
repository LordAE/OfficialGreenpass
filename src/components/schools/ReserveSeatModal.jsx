import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Reservation } from '@/api/entities';
import { User } from '@/api/entities';
import SharedPaymentGateway from '../payments/SharedPaymentGateway';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import { createPageUrl } from '@/utils';

export default function ReserveSeatModal({ isOpen, onClose, program }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [paymentStep, setPaymentStep] = useState(false);
  const [createdReservation, setCreatedReservation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const depositAmount = 50;

  useEffect(() => {
    if (isOpen) {
      const fetchUser = async () => {
        try {
          const user = await User.me();
          setCurrentUser(user);
        } catch (e) {
          onClose();
          window.location.href = createPageUrl('Welcome');
        }
      };
      fetchUser();
      // Reset state when modal opens
      setPaymentStep(false);
      setCreatedReservation(null);
      setError(null);
    }
  }, [isOpen, onClose]);

  const handleReserve = async () => {
    if (!currentUser || !program) return;
    setLoading(true);
    setError(null);
    
    try {
      const reservationData = {
        student_id: currentUser.id,
        school_id: program.id, // Using program ID as school reference
        program_id: program.id,
        program_name: program.program_title,
        school_name: program.institution_name,
        reservation_code: `RES-${program.id.slice(-4)}-${Date.now().toString().slice(-6)}`,
        amount_usd: depositAmount,
        status: 'pending_payment',
        hold_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours default
      };
      
      const newReservation = await Reservation.create(reservationData);
      setCreatedReservation(newReservation);
      setPaymentStep(true);
    } catch (err) {
      console.error("Failed to create reservation:", err);
      setError("Could not create seat reservation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (payment) => {
    onClose();
    // Redirect to a success page or show a success message
    window.location.href = createPageUrl(`ReservationStatus?reservationId=${createdReservation.id}`);
  };

  if (!program) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reserve Your Seat</DialogTitle>
          <DialogDescription>
            Confirm details to reserve a seat for {program.program_title} at {program.institution_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {!paymentStep ? (
            <>
              <Alert className="mb-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Seat Reservation Deposit</AlertTitle>
                <AlertDescription>
                  A ${depositAmount} USD deposit is required. This is non-refundable under normal circumstances but may be credited towards your tuition upon successful enrollment.
                </AlertDescription>
              </Alert>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>School:</span> 
                  <span className="font-medium">{program.institution_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Program:</span> 
                  <span className="font-medium">{program.program_title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Student:</span> 
                  <span className="font-medium">{currentUser?.full_name}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-bold">Deposit Amount:</span> 
                    <span className="font-bold text-lg text-green-600">${depositAmount}.00 USD</span>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
              
              <Button onClick={handleReserve} className="w-full mt-6" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Proceed to Payment"}
              </Button>
            </>
          ) : (
            <SharedPaymentGateway 
              amountUSD={depositAmount}
              relatedEntityId={createdReservation.id}
              relatedEntityType="reservation"
              onPaymentSuccess={handlePaymentSuccess}
              paymentReference={`Seat reservation for ${program.program_title}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}