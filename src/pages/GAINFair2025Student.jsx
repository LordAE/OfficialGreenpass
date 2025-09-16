import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StudentRSVP } from '@/api/entities';
import { Event } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Building, Calendar, MapPin, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const StudentTicket = () => {
    const [rsvp, setRsvp] = useState(null);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const loadData = async () => {
            const params = new URLSearchParams(location.search);
            const eventId = params.get('id');
            if (!eventId) {
                setLoading(false);
                return;
            }

            try {
                const user = await User.me();
                const [rsvpData, eventData] = await Promise.all([
                    StudentRSVP.filter({ event_id: eventId, user_id: user.id }),
                    Event.filter({ event_id: eventId })
                ]);
                
                if (rsvpData.length > 0) setRsvp(rsvpData[0]);
                if (eventData.length > 0) setEvent(eventData[0]);

            } catch (error) {
                console.error("Failed to load ticket details", error);
            }
            setLoading(false);
        };
        loadData();
    }, [location.search]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;
    }

    if (!rsvp || !event) {
        return <div className="min-h-screen flex items-center justify-center"><Card><CardContent className="p-8">Could not find your ticket details.</CardContent></Card></div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">Your Event Ticket</h1>
                    <p className="text-lg text-gray-600">You're all set for {event.title}!</p>
                </div>

                <Card className="shadow-xl overflow-hidden">
                    <div className="grid md:grid-cols-3">
                        <div className="md:col-span-2 p-8">
                            <Badge className="bg-blue-100 text-blue-800">Student Pass - Free</Badge>
                            <h2 className="text-3xl font-bold mt-4">{rsvp.name}</h2>
                            <p className="text-gray-500">{rsvp.email}</p>
                            
                            <div className="border-t my-6"></div>

                            <h3 className="font-semibold text-lg mb-4">Event Information</h3>
                            <div className="space-y-3 text-gray-700">
                                <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-blue-600"/><p>{format(new Date(event.start), 'MMMM dd, yyyy')}</p></div>
                                <div className="flex items-center gap-3"><Clock className="w-5 h-5 text-blue-600"/><p>{format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}</p></div>
                                <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-blue-600"/><p>{event.location}</p></div>
                            </div>
                        </div>

                        <div className="md:col-span-1 bg-gradient-to-br from-blue-500 to-emerald-500 flex flex-col items-center justify-center text-center p-8 text-white">
                            <h3 className="font-semibold text-lg mb-2">Scan at the Door</h3>
                            <div className="p-4 bg-white rounded-lg shadow-lg">
                                <img src={rsvp.ticket_qr_url} alt="Student QR Code Ticket" className="w-40 h-40"/>
                            </div>
                            <p className="mt-4 text-sm opacity-80">This is your unique ticket for entry.</p>
                        </div>
                    </div>
                </Card>
                
                <Card className="mt-8">
                    <CardHeader><CardTitle>Attending Schools</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-gray-600">A full list of attending schools and institutions will be available here closer to the event date. Get ready to connect with representatives from top schools worldwide!</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default StudentTicket;