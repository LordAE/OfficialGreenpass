import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MarketplaceOrder } from '@/api/entities';
import { Service } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function MarketplaceOrderSuccess() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (!orderId) {
      setError('Order ID is missing.');
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        const orderData = await MarketplaceOrder.get(orderId);
        if (!orderData) throw new Error('Order not found.');
        setOrder(orderData);
        
        const serviceData = await Service.get(orderData.service_id);
        if (!serviceData) throw new Error('Service not found.');
        setService(serviceData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center text-center">
        <div>
          <h2 className="text-2xl font-bold text-red-600">Error</h2>
          <p className="text-gray-700">{error}</p>
          <Link to={createPageUrl('Marketplace')}>
            <Button className="mt-4">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Booking Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-700">
            Your booking for the service has been confirmed. The vendor will be in touch with you shortly.
          </p>
          {service && order && (
            <div className="text-left bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">Order Summary</h4>
              <p><strong>Service:</strong> {service.name}</p>
              <p><strong>Order ID:</strong> {order.id}</p>
              <p><strong>Amount Paid:</strong> ${order.amount_usd.toFixed(2)} USD</p>
            </div>
          )}
          <div className="flex gap-4 pt-4">
            <Link to={createPageUrl('MyOrders')} className="flex-1">
              <Button variant="outline" className="w-full">View My Orders</Button>
            </Link>
            <Link to={createPageUrl('Marketplace')} className="flex-1">
              <Button className="w-full">Continue Shopping</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}