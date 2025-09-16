import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Users, School, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const sampleEvents = [
    { id: '1', title: 'Canadian Education Fair 2025', startDate: '2025-02-15T09:00:00', endDate: '2025-02-16T17:00:00', city: 'Ho Chi Minh City', country: 'Vietnam', isOnline: false, venue: 'Saigon Exhibition and Convention Center', imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop', isFree: true, description: 'Meet representatives from over 50 top Canadian universities and colleges. Get your questions answered about programs, admissions, scholarships, and student life. A must-attend event for aspiring students.', type: 'fair', attendees: ['University of Toronto', 'UBC', 'McGill University', 'Seneca College'] },
    { id: '2', title: 'IELTS Preparation Workshop', startDate: '2025-02-20T14:00:00', endDate: '2025-02-20T16:00:00', city: 'Hanoi', country: 'Vietnam', isOnline: true, venue: 'Online via Zoom', imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=400&fit=crop', isFree: true, description: 'Join our free 2-hour workshop covering essential IELTS strategies for reading, writing, listening, and speaking. Led by a certified IELTS instructor.', type: 'workshop', attendees: ['Certified IELTS Tutors'] },
];

export default function EventDetail() {
    const [event, setEvent] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const eventId = params.get('id');
        const foundEvent = sampleEvents.find(e => e.id === eventId);
        setEvent(foundEvent);
    }, [location]);

    if (!event) {
        return <div className="min-h-screen flex items-center justify-center">Loading event details...</div>;
    }
    
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="relative">
                <img src={event.imageUrl} alt={event.title} className="w-full h-64 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Link to={createPageUrl('events')} className="inline-flex items-center gap-2 text-gray-200 hover:text-white transition-colors mb-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Events
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-extrabold">{event.title}</h1>
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-lg">
                            <div className="flex items-center gap-2"><Calendar className="h-5 w-5" /> {formatDate(event.startDate)}</div>
                            <div className="flex items-center gap-2"><MapPin className="h-5 w-5" /> {event.isOnline ? 'Online Event' : `${event.city}, ${event.country}`}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <Card>
                            <CardHeader><CardTitle>About this event</CardTitle></CardHeader>
                            <CardContent><p className="text-gray-700 leading-relaxed">{event.description}</p></CardContent>
                        </Card>
                        {event.attendees && (
                             <Card>
                                <CardHeader><CardTitle>Who's Attending?</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-3">
                                        {event.attendees.map(attendee => (
                                            <Badge key={attendee} variant="outline" className="text-base p-2">
                                                <School className="h-4 w-4 mr-2" /> {attendee}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <div className="space-y-6">
                        <Card className="bg-blue-50 border-blue-200">
                             <CardHeader>
                                <CardTitle className="text-blue-800">Event Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="font-semibold text-blue-800">{formatDate(event.startDate)}</p>
                                        {event.startDate !== event.endDate && <p className="font-semibold text-blue-800">{formatDate(event.endDate)}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="font-semibold text-blue-800">{formatTime(event.startDate)} - {formatTime(event.endDate)}</p>
                                    </div>
                                </div>
                                 <div className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-blue-600 mt-1" />
                                    <div>
                                        <p className="font-semibold text-blue-800">{event.venue}</p>
                                        {!event.isOnline && <p className="text-sm text-blue-700">{event.city}, {event.country}</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>{event.isFree ? 'Free Registration' : 'Register Now'}</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-gray-600 mb-4">{event.isFree ? 'This event is free to attend. Register now to secure your spot!' : 'Purchase your ticket to attend this event.'}</p>
                                <Link to={createPageUrl(`eventregistration?id=${event.id}`)}>
                                    <Button className="w-full bg-green-600 hover:bg-green-700">Register for Event</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}