import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Reservation } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, XCircle, Award, ArrowRight, Home } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ReservationStatus() {
  const query = useQuery();
  const reservationCode = query.get('code');
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reservationCode) {
      const fetchReservation = async () => {
        try {
          const results = await Reservation.filter({ reservation_code: reservationCode });
          if (results.length > 0) {
            setReservation(results[0]);
          }
        } catch (err) {
          console.error("Failed to fetch reservation:", err);
        }
        setLoading(false);
      };
      fetchReservation();
    } else {
      setLoading(false);
    }
  }, [reservationCode]);

  const StatusDisplay = ({ status }) => {
    const statusMap = {
      confirmed: {
        icon: <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />,
        title: "Reservation Confirmed",
        description: "Your seat is held! You can now proceed to the full application.",
        color: "emerald"
      },
      expired: {
        icon: <Clock className="w-16 h-16 text-yellow-500 mx-auto" />,
        title: "Reservation Expired",
        description: "Your reservation hold has expired. You can create a new one if seats are available.",
        color: "yellow"
      },
      cancelled: {
        icon: <XCircle className="w-16 h-16 text-red-500 mx-auto" />,
        title: "Reservation Cancelled",
        description: "This reservation has been cancelled.",
        color: "red"
      },
      credited: {
        icon: <Award className="w-16 h-16 text-blue-500 mx-auto" />,
        title: "Reservation Credited",
        description: "Your deposit has been credited towards your application fee.",
        color: "blue"
      }
    };
    const currentStatus = statusMap[status] || statusMap.cancelled;

    return (
      <div className="text-center py-6">
        {currentStatus.icon}
        <h2 className={`text-3xl font-bold text-${currentStatus.color}-600 mt-4`}>{currentStatus.title}</h2>
        <p className="text-gray-600 mt-2">{currentStatus.description}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-3xl font-bold text-red-600 mt-4">Invalid Reservation Code</h2>
        <p className="text-gray-600 mt-2">We couldn't find a reservation with this code. Please check the link or code.</p>
        <Link to={createPageUrl('Dashboard')}>
          <Button className="mt-6"><Home className="mr-2 h-4 w-4"/> Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(reservation.qr_payload)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <StatusDisplay status={reservation.status} />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Reservation Code</p>
              <p className="text-2xl font-mono tracking-widest bg-gray-100 inline-block px-4 py-1 rounded-lg">
                {reservation.reservation_code}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b py-4">
              <div>
                <p className="text-sm text-gray-500">School</p>
                <p className="font-semibold">{reservation.school_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Program</p>
                <p className="font-semibold">{reservation.program_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
                <img src={qrCodeImageUrl} alt="Reservation QR Code" className="rounded-lg shadow-md" />
                <div>
                  <p className="text-sm text-gray-500">Hold Expires On</p>
                  <p className="font-semibold text-lg text-red-600">{format(new Date(reservation.hold_expires_at), "dd MMMM yyyy, hh:mm a")}</p>
                   <p className="text-xs text-gray-500 mt-2">Agents can scan this QR at education fairs to quickly access your profile.</p>
                </div>
            </div>

            {reservation.status === 'confirmed' && (
              <Button className="w-full text-lg py-6 bg-gradient-to-r from-emerald-600 to-blue-600">
                Start Full Application
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
            {reservation.status === 'credited' && (
              <Button className="w-full text-lg py-6" variant="outline">
                View Application Case
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}