
import React, { useState, useEffect, useCallback } from 'react';
import { Event } from '@/api/entities';
import { EventRegistration } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlusCircle, Edit, Trash2, Calendar as CalendarIcon, Users, UserCheck, Eye, MoreHorizontal, Search, Loader2, CheckCircle, XCircle, X as XIcon } from "lucide-react";
import EventForm from '../components/events/EventForm';
import EventRoleAssignment from '../components/events/EventRoleAssignment';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/URLRedirect';
import { motion, AnimatePresence } from 'framer-motion';

// Mobile Event Card Component
const MobileEventCard = ({ event, eventStats, onEdit, onDelete, deleting, openRolesModal }) => {
  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.start);
    const end = new Date(event.end);

    if (now > end) {
      return <Badge variant="secondary" className="text-xs">Past</Badge>;
    } else if (now >= start && now <= end) {
      return <Badge className="bg-red-500 text-white animate-pulse text-xs">Live</Badge>;
    } else {
      return <Badge variant="outline" className="text-green-600 border-green-200 text-xs">Upcoming</Badge>;
    }
  };

  const stats = eventStats[event.id] || { totalRegistrations: 0, paidRegistrations: 0, checkedInRegistrations: 0 };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate pr-2">{event.title}</h3>
            <p className="text-sm text-gray-500 truncate">{event.location}</p>
            <p className="text-xs text-gray-400 mt-1">{format(new Date(event.start), 'MMM dd, yyyy')}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getEventStatus(event)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(event)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl(`EventCheckIn?eventId=${event.event_id}`)}>
                    <Users className="w-4 h-4 mr-2" /> Manage Attendees
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openRolesModal(event)}>
                  <UserCheck className="w-4 h-4 mr-2" /> Staff Roles
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl(`EventDetails?id=${event.event_id}`)} target="_blank">
                    <Eye className="w-4 h-4 mr-2" /> View Public Page
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(event)} 
                  className="text-red-600 focus:text-red-600 focus:bg-red-50" 
                  disabled={deleting === event.id}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{stats.totalRegistrations}</div>
            <div className="text-xs text-gray-500">Registered</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{stats.paidRegistrations}</div>
            <div className="text-xs text-gray-500">Paid</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">{stats.checkedInRegistrations}</div>
            <div className="text-xs text-gray-500">Checked In</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEventForForm, setSelectedEventForForm] = useState(null);
  const [eventStats, setEventStats] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [selectedEventForRoles, setSelectedEventForRoles] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [user, eventData] = await Promise.all([
        User.me(),
        Event.list(),
      ]);
      setCurrentUser(user);
      
      const sortedEvents = eventData.sort((a, b) => new Date(b.start) - new Date(a.start));
      setEvents(sortedEvents);
      
      const stats = {};
      for (const event of sortedEvents) {
        try {
          const registrations = await EventRegistration.filter({ event_id: event.event_id });
          stats[event.id] = {
            totalRegistrations: registrations.length,
            paidRegistrations: registrations.filter(r => r.status === 'paid').length,
            checkedInRegistrations: registrations.filter(r => r.checked_in).length,
          };
        } catch (error) {
          console.warn(`Could not load stats for event ${event.id}`);
          stats[event.id] = { totalRegistrations: 0, paidRegistrations: 0, checkedInRegistrations: 0 };
        }
      }
      setEventStats(stats);
    } catch (error) {
      console.error("Error loading initial data:", error);
      if (error?.response?.status === 401) {
        navigate(createPageUrl('Welcome'));
      }
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);
  
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = events.filter(item => {
      return (
        item.title?.toLowerCase().includes(lowercasedFilter) ||
        item.location?.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredEvents(filtered);
  }, [searchTerm, events]);

  const loadEvents = async () => {
    try {
      const eventData = await Event.list();
      const sortedEvents = eventData.sort((a, b) => new Date(b.start) - new Date(a.start));
      setEvents(sortedEvents);
      
      const stats = {};
      for (const event of sortedEvents) {
        try {
          const registrations = await EventRegistration.filter({ event_id: event.event_id });
          stats[event.id] = {
            totalRegistrations: registrations.length,
            paidRegistrations: registrations.filter(r => r.status === 'paid').length,
            checkedInRegistrations: registrations.filter(r => r.checked_in).length,
          };
        } catch (error) {
          console.warn(`Could not load stats for event ${event.id}`);
          stats[event.id] = { totalRegistrations: 0, paidRegistrations: 0, checkedInRegistrations: 0 };
        }
      }
      setEventStats(stats);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleFormSave = async (eventData) => {
    try {
      if (selectedEventForForm) {
        await Event.update(selectedEventForForm.id, eventData);
      } else {
        await Event.create(eventData);
      }
      setIsFormOpen(false);
      setSelectedEventForForm(null);
      await loadEvents();
      setNotification({ type: 'success', message: 'Event saved successfully!' });
    } catch (error) {
      console.error("Error saving event:", error);
      setNotification({ type: 'error', message: 'Failed to save event. Please try again.' });
    }
  };

  const handleDeleteEvent = async (eventToDelete) => {
    const confirmMessage = `Are you sure you want to delete "${eventToDelete.title}"? This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) return;

    setDeleting(eventToDelete.id);
    try {
      const registrations = await EventRegistration.filter({ event_id: eventToDelete.event_id });
      for (const registration of registrations) {
        await EventRegistration.delete(registration.id);
      }
      await Event.delete(eventToDelete.id);
      await loadEvents();
      setNotification({ type: 'success', message: 'Event deleted successfully.' });
    } catch (error) {
      console.error("Error deleting event:", error);
      setNotification({ type: 'error', message: 'Failed to delete event. Please try again.' });
    } finally {
      setDeleting(null);
    }
  };

  const openEditForm = (event = null) => {
    setSelectedEventForForm(event);
    setIsFormOpen(true);
  };
  
  const openRolesModal = (event) => {
    setSelectedEventForRoles(event);
    setIsRolesModalOpen(true);
  };
  
  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.start);
    const end = new Date(event.end);

    if (now > end) {
      return <Badge variant="secondary">Past</Badge>;
    } else if (now >= start && now <= end) {
      return <Badge className="bg-red-500 text-white animate-pulse">Live</Badge>;
    } else {
      return <Badge variant="outline" className="text-green-600 border-green-200">Upcoming</Badge>;
    }
  };

  if (loading && !events.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`fixed top-0 left-1/2 w-full max-w-md p-4 rounded-b-lg shadow-2xl flex items-start space-x-4 z-[100] ${
              notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-bold text-lg">{notification.type === 'success' ? 'Success!' : 'Error'}</p>
              <p className="text-sm">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2 text-gray-800">
                <CalendarIcon className="w-5 h-5 sm:w-8 sm:h-8" />
                Event Management
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1 sm:mt-2">
                Create, view, and manage all company events.
              </p>
            </div>
            
            {currentUser?.user_type === 'admin' && (
              <Button onClick={() => openEditForm()} className="w-full sm:w-auto">
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            )}
          </div>

          {/* Search Bar - Full Width on Mobile */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by event title or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 h-12"
            />
          </div>
        </div>

        <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) setSelectedEventForForm(null); setIsFormOpen(isOpen); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedEventForForm ? "Edit Event" : "Create New Event"}</DialogTitle>
            </DialogHeader>
            <EventForm event={selectedEventForForm} onSave={handleFormSave} onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
        
        <Dialog open={isRolesModalOpen} onOpenChange={setIsRolesModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Staff Assignments for {selectedEventForRoles?.title}</DialogTitle>
            </DialogHeader>
            {selectedEventForRoles && <EventRoleAssignment event={selectedEventForRoles} />}
          </DialogContent>
        </Dialog>

        {/* Events List - Mobile and Desktop Views */}
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            {/* Desktop Table View - Hidden on Mobile */}
            <div className="hidden lg:block">
              <Card>
                <CardHeader>
                  <CardTitle>All Events</CardTitle>
                  <CardDescription>A list of all past, present, and future events.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[35%]">Event</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Stats</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map(event => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div className="font-medium">{event.title}</div>
                            <div className="text-sm text-muted-foreground">{event.location}</div>
                          </TableCell>
                          <TableCell>{format(new Date(event.start), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{getEventStatus(event)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              <span>Reg: <strong>{eventStats[event.id]?.totalRegistrations || 0}</strong></span>
                              <span>Paid: <strong>{eventStats[event.id]?.paidRegistrations || 0}</strong></span>
                              <span>In: <strong>{eventStats[event.id]?.checkedInRegistrations || 0}</strong></span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditForm(event)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem asChild><Link to={createPageUrl(`EventCheckIn?eventId=${event.event_id}`)}><Users className="w-4 h-4 mr-2" /> Manage Attendees</Link></DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openRolesModal(event)}><UserCheck className="w-4 h-4 mr-2" /> Staff Roles</DropdownMenuItem>
                                <DropdownMenuItem asChild><Link to={createPageUrl(`EventDetails?id=${event.event_id}`)} target="_blank"><Eye className="w-4 h-4 mr-2" /> View Public Page</Link></DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteEvent(event)} className="text-red-600 focus:text-red-600 focus:bg-red-50" disabled={deleting === event.id}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Card View - Hidden on Desktop */}
            <div className="lg:hidden space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">All Events ({filteredEvents.length})</h2>
              </div>
              {filteredEvents.map(event => (
                <MobileEventCard 
                  key={event.id}
                  event={event}
                  eventStats={eventStats}
                  onEdit={openEditForm}
                  onDelete={handleDeleteEvent}
                  deleting={deleting}
                  openRolesModal={openRolesModal}
                />
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-20">
              <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first event.'}
              </p>
              {currentUser?.user_type === 'admin' && !searchTerm && (
                <Button onClick={() => openEditForm()}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create Your First Event
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
