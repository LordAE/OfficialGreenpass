import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users, ShoppingCart, Star, DollarSign } from 'lucide-react';

export default function VendorAnalytics() {
  const [analytics] = useState({
    totalOrders: 24,
    revenue: 1850,
    avgRating: 4.7,
    repeatCustomers: 8,
    conversionRate: 12.5,
    topServices: [
      { name: "Airport Pickup", orders: 12, revenue: 960 },
      { name: "SIM Card", orders: 8, revenue: 320 },
      { name: "City Tour", orders: 4, revenue: 570 }
    ]
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <BarChart3 className="w-8 h-8 text-orange-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-blue-600 bg-clip-text text-transparent">
            Vendor Analytics
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{analytics.totalOrders}</div>
                  <p className="text-gray-600">Total Orders</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">${analytics.revenue}</div>
                  <p className="text-gray-600">Revenue</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{analytics.avgRating}</div>
                  <p className="text-gray-600">Avg Rating</p>
                </div>
                <Star className="w-8 h-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{analytics.repeatCustomers}</div>
                  <p className="text-gray-600">Repeat Customers</p>
                </div>
                <Users className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">
                  {analytics.conversionRate}%
                </div>
                <p className="text-gray-600">Visitors to customers</p>
                <Badge className="mt-4 bg-green-100 text-green-800">
                  +2.3% from last month
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topServices.map((service, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-gray-600">{service.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${service.revenue}</p>
                      <p className="text-sm text-gray-600">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-blue-600">+18%</div>
                <p className="text-gray-600">Order Growth</p>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-green-600">+25%</div>
                <p className="text-gray-600">Revenue Growth</p>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl font-bold text-purple-600">+0.3</div>
                <p className="text-gray-600">Rating Improvement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}