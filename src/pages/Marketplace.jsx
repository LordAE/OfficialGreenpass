// src/pages/Marketplace.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Star, DollarSign, ShoppingCart, Loader2, CheckCircle } from 'lucide-react';

// ---- Firebase ----
import { db } from '@/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const COLLECTIONS = {
  services: 'services',
  vendors: 'vendors',
  users: 'users',
  orders: 'marketplace_orders',
};

const BookingModal = ({ service, vendor, vendorUser, open, onOpenChange }) => {
  const [booking, setBooking] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);

  const handleBookNow = async () => {
    try {
      setBooking(true);

      // Get current signed-in user (assumes your "users" docs are keyed by auth.uid)
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('Please sign in to book this service.');
        return;
      }

      // Create marketplace order
      const orderData = {
        service_id: service.id,
        vendor_id: service.vendor_id,
        student_id: currentUser.uid,
        amount_usd: Number(service.price_usd || 0),
        status: 'pending',           // business status
        payment_status: 'pending',   // payment status
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.orders), orderData);

      setBookingComplete(true);

      // Redirect to checkout (preserves your existing flow)
      setTimeout(() => {
        const checkoutUrl = `/Checkout?type=marketplace_order&packageId=${encodeURIComponent(docRef.id)}`;
        window.location.href = checkoutUrl;
      }, 1500);
    } catch (error) {
      console.error('Error booking service:', error);
      alert('Failed to book service. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  if (!service) return null;

  if (bookingComplete) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Booking Created</h3>
            <p className="text-gray-600 mb-4">
              You’ll be redirected to complete payment…
            </p>
            <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book Service</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{service?.name}</h3>
            <p className="text-gray-600">{service?.description}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Service Provider:</span>
              <span>{vendorUser?.full_name || 'Vendor'}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Category:</span>
              <Badge variant="secondary">{service?.category || 'General'}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Price:</span>
              <span className="text-xl font-bold text-green-600">${service?.price_usd || 0}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleBookNow} disabled={booking} className="flex-1">
              {booking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booking…
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Book Now
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ServiceCard = ({ service, vendor, vendorUser, onBookService }) => (
  <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
    <div className="aspect-video bg-gradient-to-br from-blue-100 to-green-100 rounded-t-lg overflow-hidden">
      <img
        src={service.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop'}
        alt={service.name}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop';
        }}
      />
    </div>

    <CardContent className="p-6 flex-grow flex flex-col">
      <div className="flex-grow">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-2">{service.name}</h3>
          <Badge variant="secondary" className="ml-2 shrink-0">{service.category || 'General'}</Badge>
        </div>

        <p className="text-gray-600 text-sm line-clamp-3 mb-4">{service.description}</p>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {vendorUser?.full_name?.charAt(0) || 'V'}
          </div>
          <div>
            <p className="font-medium text-sm">{vendorUser?.full_name || 'Vendor'}</p>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs text-gray-600">{vendor?.rating ?? 4.5}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-green-600">${service.price_usd || 0}</span>
          <Badge variant="outline">{service.status || 'inactive'}</Badge>
        </div>
        <Button
          onClick={() => onBookService(service, vendor, vendorUser)}
          className="w-full"
          disabled={(service.status || 'inactive') !== 'active'}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Book Now
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default function Marketplace() {
  const [services, setServices] = useState([]);
  const [vendors, setVendors] = useState({});
  const [vendorUsers, setVendorUsers] = useState({});
  const [filteredServices, setFilteredServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [selectedService, setSelectedService] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedVendorUser, setSelectedVendorUser] = useState(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // services (optionally filter by active here or filter later in UI)
        const servicesSnap = await getDocs(collection(db, COLLECTIONS.services));
        const servicesList = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setServices(servicesList);

        // vendors
        const vendorsSnap = await getDocs(collection(db, COLLECTIONS.vendors));
        const vendorsList = vendorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const vendorMap = vendorsList.reduce((acc, v) => {
          acc[v.id] = v;
          return acc;
        }, {});
        setVendors(vendorMap);

        // users (to get vendor display names)
        const usersSnap = await getDocs(collection(db, COLLECTIONS.users));
        const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        // map vendor_id -> user
        const vUserMap = {};
        vendorsList.forEach(v => {
          const u = usersList.find(u => u.id === v.user_id);
          if (u) vUserMap[v.id] = u;
        });
        setVendorUsers(vUserMap);
      } catch (err) {
        console.error('Error loading marketplace data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    let filtered = services.filter(s => (s.status || 'inactive') === 'active');

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(service =>
        (service.name || '').toLowerCase().includes(s) ||
        (service.description || '').toLowerCase().includes(s)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(service => (service.category || '') === categoryFilter);
    }

    setFilteredServices(filtered);
  }, [services, searchTerm, categoryFilter]);

  const handleBookService = (service, vendor, vendorUser) => {
    setSelectedService(service);
    setSelectedVendor(vendor);
    setSelectedVendorUser(vendorUser);
    setBookingModalOpen(true);
  };

  const categories = [...new Set(services.map(s => s.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Student Services Marketplace
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover essential services from verified providers to support your study abroad journey
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Showing {filteredServices.length} of {services.length} services
            </p>
          </CardContent>
        </Card>

        {/* Services Grid */}
        {filteredServices.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                vendor={vendors[service.vendor_id]}
                vendorUser={vendorUsers[service.vendor_id]}
                onBookService={handleBookService}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Services Found</h3>
              <p className="text-gray-600">
                {searchTerm || categoryFilter !== 'all'
                  ? 'Try adjusting your search filters'
                  : 'Services will be available soon'}
              </p>
            </CardContent>
          </Card>
        )}

        <BookingModal
          service={selectedService}
          vendor={selectedVendor}
          vendorUser={selectedVendorUser}
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
        />
      </div>
    </div>
  );
}
