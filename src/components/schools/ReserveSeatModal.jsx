import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Terminal } from "lucide-react";
import { Reservation, User } from "@/api/entities";
import SharedPaymentGateway from "../payments/SharedPaymentGateway";
import { createPageUrl } from "@/utils";

/**
 * Supports BOTH prop styles:
 *   - open / onOpenChange  (your ProgramDetails uses this)
 *   - isOpen / onClose     (legacy)
 * Expects: program (with programTitle/title) and school (with name)
 */
export default function ReserveSeatModal(props) {
  const {
    open,                   // preferred (current)
    onOpenChange,           // preferred (current)
    isOpen: isOpenProp,     // legacy
    onClose,                // legacy
    program,
    school,
  } = props;

  // Bridge prop styles
  const isOpen = typeof open === "boolean" ? open : !!isOpenProp;
  const setOpen = (next) => {
    if (typeof onOpenChange === "function") onOpenChange(next);
    else if (!next && typeof onClose === "function") onClose();
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [paymentStep, setPaymentStep] = useState(false);
  const [createdReservation, setCreatedReservation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const depositAmount = 50;
  const formatUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  // Load/clear when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPaymentStep(false);
      setCreatedReservation(null);
      setError(null);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        console.error("[ReserveSeatModal] User.me failed:", e);
        setOpen(false);
        window.location.href = createPageUrl("Welcome");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleReserve = async () => {
    if (!currentUser || !program || loading || createdReservation) return;
    setLoading(true);
    setError(null);
    try {
      const reservationData = {
        student_id: currentUser.id,
        program_id: program.id || program.programId || program.program_id,
        program_name:
          program.programTitle || program.program_title || program.title || "Program",
        school_name:
          school?.name || program.schoolName || program.institution_name || "School",
        amount_usd: depositAmount,
        status: "pending_payment",
        // Client-side preview; ideally server computes expiry
        hold_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      };
      const newReservation = await Reservation.create(reservationData);
      setCreatedReservation(newReservation);
      setPaymentStep(true);
    } catch (err) {
      console.error("[ReserveSeatModal] Reservation.create failed:", err);
      setError("Could not create seat reservation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setOpen(false);
    const qp = [];
    if (createdReservation?.reservation_code) {
      qp.push(`code=${encodeURIComponent(createdReservation.reservation_code)}`);
    }
    if (createdReservation?.id) {
      qp.push(`reservationId=${encodeURIComponent(createdReservation.id)}`);
    }
    const qs = qp.length ? `?${qp.join("&")}` : "";
    window.location.href = createPageUrl(`ReservationStatus${qs}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reserve Your Seat</DialogTitle>
          <DialogDescription>
            Secure a seat for{" "}
            <span className="font-semibold">
              {program?.programTitle || program?.program_title || program?.title}
            </span>{" "}
            at{" "}
            <span className="font-semibold">
              {school?.name || program?.schoolName || program?.institution_name || "School"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertTitle>Reservation Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!paymentStep && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground mb-1">Deposit Amount</div>
              <div className="text-2xl font-bold text-green-600">
                {formatUSD.format(depositAmount)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                This deposit holds your seat for 72 hours while we confirm details. It is credited
                towards your package.
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Program:{" "}
                <span className="font-medium text-foreground">
                  {program?.programTitle || program?.program_title || program?.title}
                </span>
                <br />
                School:{" "}
                <span className="font-medium text-foreground">
                  {school?.name || program?.schoolName || program?.institution_name || "School"}
                </span>
              </div>

              <Button onClick={handleReserve} disabled={loading || !currentUser || !program}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reserving…
                  </>
                ) : (
                  "Reserve Seat"
                )}
              </Button>
            </div>

            {!currentUser && (
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Sign in required</AlertTitle>
                <AlertDescription>
                  You’ll be redirected to sign in before reserving.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {paymentStep && createdReservation && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground mb-1">Reservation Created</div>
              <div className="text-sm">
                Please complete the payment to confirm your seat for{" "}
                <span className="font-medium">
                  {program?.programTitle || program?.program_title || program?.title}
                </span>
                .
              </div>
            </div>

            <SharedPaymentGateway
              amountUSD={depositAmount}
              relatedEntityId={createdReservation.id}
              relatedEntityType="reservation"
              onPaymentSuccess={handlePaymentSuccess}
              paymentReference={`Seat reservation for ${
                program?.programTitle || program?.program_title || "Program"
              }`}
            />

            <div className="text-xs text-muted-foreground">
              After payment, you’ll be redirected to your Reservation Status page.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
