
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Event } from '@/api/entities';
import { EventRegistration } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, Users, UserCheck, DollarSign, Search, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import QRScanner from '../components/events/QRScanner';
import SharedPaymentGateway from '../components/payments/SharedPaymentGateway';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EventCheckIn() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const initialTab = searchParams.get('tab') || 'attendees';
  
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [stats, setStats] = useState({
    total: 0,
    checked_in: 0,
    paid: 0,
    pending: 0
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        console.error("No user logged in", e);
      }
    };
    fetchUser();
  }, []);

  const calculateStats = (regs) => {
    const stats = {
      total: regs.length,
      checked_in: regs.filter(r => r.checked_in).length,
      paid: regs.filter(r => r.status === 'paid').length,
      pending: regs.filter(r => r.status === 'pending_payment').length
    };
    setStats(stats);
  };

  const loadEventData = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      // The current implementation already fetches the event by its 'event_id' property.
      // Assuming Event.filter({ event_id: eventId }) is the correct API call
      // to retrieve an event using the 'event_id' field.
      const [eventData, registrationData] = await Promise.all([
        Event.filter({ event_id: eventId }),
        EventRegistration.filter({ event_id: eventId })
      ]);

      if (eventData.length > 0) {
        setEvent(eventData[0]);
      }
      setRegistrations(registrationData);
      calculateStats(registrationData);
    } catch (error) {
      console.error("Error loading event data:", error);
    }
    setLoading(false);
  }, [eventId]);

  const filterRegistrations = useCallback(() => {
    let filtered = registrations;

    if (searchTerm) {
      filtered = filtered.filter(reg =>
        reg.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.reservation_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'checked_in') {
        filtered = filtered.filter(reg => reg.checked_in);
      } else if (statusFilter === 'not_checked_in') {
        filtered = filtered.filter(reg => !reg.checked_in);
      } else {
        filtered = filtered.filter(reg => reg.status === statusFilter);
      }
    }

    setFilteredRegistrations(filtered);
  }, [registrations, searchTerm, statusFilter]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  useEffect(() => {
    filterRegistrations();
  }, [filterRegistrations]);

  const handleCheckIn = async (registration) => {
    try {
      await EventRegistration.update(registration.id, {
        checked_in: true,
        check_in_time: new Date().toISOString(),
        checked_in_by: currentUser?.email || 'admin'
      });
      
      // Refresh data
      loadEventData();
    } catch (error) {
      console.error("Error checking in attendee:", error);
      alert("Failed to check in attendee. Please try again.");
    }
  };

  const handleOpenPaymentModal = (registration) => {
    setSelectedRegistration(registration);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async (paymentType, transactionId, details) => {
    if (!selectedRegistration) return;

    try {
        await EventRegistration.update(selectedRegistration.id, {
            status: 'paid',
            payment_method: 'same_day',
            payment_date: new Date().toISOString(),
        });
        
        setIsPaymentModalOpen(false);
        setSelectedRegistration(null);
        await loadEventData();
        alert('Payment processed and registration updated successfully!');

    } catch (error) {
        console.error("Error updating registration after payment:", error);
        alert("Payment was successful, but failed to update the registration status. Please check manually.");
    }
  };


  const getStatusBadge = (registration) => {
    if (registration.checked_in) {
      return <Badge className="bg-green-100 text-green-800">Checked In</Badge>;
    }
    
    switch (registration.status) {
      case 'paid':
        return <Badge className="bg-blue-100 text-blue-800">Paid - Not Checked In</Badge>;
      case 'pending_payment':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Payment</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{registration.status}</Badge>;
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRegistrations = filteredRegistrations.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">Loading event data...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
        <p className="text-gray-600 mb-4">The event you're looking for could not be found.</p>
        <Link to={createPageUrl('AdminEvents')}>
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link to={createPageUrl('AdminEvents')}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Events
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{event.title}</h1>
              <p className="text-gray-600">
                {format(new Date(event.start), 'PPP')} • {event.location}
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <p className="text-gray-600 text-sm">Total Registrations</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.checked_in}</div>
                    <p className="text-gray-600 text-sm">Checked In</p>
                  </div>
                  <UserCheck className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{stats.paid}</div>
                    <p className="text-gray-600 text-sm">Paid</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    <p className="text-gray-600 text-sm">Pending Payment</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="attendees">Attendee List</TabsTrigger>
            <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
          </TabsList>

          <TabsContent value="attendees" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle>Event Attendees</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search attendees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending_payment">Pending Payment</SelectItem>
                        <SelectItem value="checked_in">Checked In</SelectItem>
                        <SelectItem value="not_checked_in">Not Checked In</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {currentRegistrations.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Check-in Time</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentRegistrations.map((registration) => (
                            <TableRow key={registration.id}>
                              <TableCell className="font-medium">
                                {registration.contact_name}
                              </TableCell>
                              <TableCell>{registration.contact_email}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{registration.role}</Badge>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(registration)}
                              </TableCell>
                              <TableCell>
                                {registration.check_in_time 
                                  ? format(new Date(registration.check_in_time), 'PPp')
                                  : '-'
                                }
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {!registration.checked_in && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleCheckIn(registration)}
                                    >
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Check In
                                    </Button>
                                  )}
                                  {registration.status === 'pending_payment' && !registration.checked_in && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenPaymentModal(registration)}
                                    >
                                      <DollarSign className="w-4 h-4 mr-2" />
                                      Process Payment
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-gray-600">
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredRegistrations.length)} of {filteredRegistrations.length} registrations
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No attendees found</h3>
                    <p className="text-gray-600">
                      {searchTerm || statusFilter !== 'all'
                        ? "No attendees match your current filters."
                        : "No one has registered for this event yet."
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scanner" className="mt-6">
            <QRScanner eventId={event.event_id} />
          </TabsContent>
        </Tabs>
      </div>
      
      {selectedRegistration && (
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Process Same-Day Payment</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <SharedPaymentGateway
                      amountUSD={selectedRegistration.amount_usd}
                      amountCAD={selectedRegistration.amount_vnd ? selectedRegistration.amount_vnd / 23000 : selectedRegistration.amount_usd * 1.35}
                      itemDescription={`Payment for ${selectedRegistration.contact_name} at ${event.title}`}
                      onCardPaymentSuccess={handlePaymentSuccess}
                      onBankTransferInitiated={handlePaymentSuccess}
                  />
                </div>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
