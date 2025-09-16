
import React, { useState, useEffect } from 'react';
import { Event } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

// Simple countdown component defined inline to avoid import issues
const SimpleCountdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({});

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      let timeLeft = {};

      if (difference > 0) {
        timeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      }
      return timeLeft;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [targetDate]);

  const timerComponents = [];
  
  Object.keys(timeLeft).forEach((interval) => {
    if (!timeLeft[interval]) return;

    timerComponents.push(
      <div key={interval} className="flex flex-col items-center">
        <span className="text-lg font-bold text-green-600">
          {timeLeft[interval].toString().padStart(2, '0')}
        </span>
        <span className="text-[10px] uppercase text-gray-500 font-medium">
          {interval}
        </span>
      </div>
    );
  });

  if (timerComponents.length === 0) {
    return (
      <div className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
        Event has started
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-3 rounded-lg border">
      <div className="text-xs text-gray-600 mb-1 text-center font-medium">Event starts in:</div>
      <div className="flex items-center justify-center gap-3">
        {timerComponents.map((component, index) => (
          <React.Fragment key={index}>
            {component}
            {index < timerComponents.length - 1 && (
              <span className="text-lg font-bold text-gray-400 pb-4">:</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// EventCard component defined inline
const EventCard = ({ event, isPast }) => (
  <motion.div 
    whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}
    className="bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 flex flex-col"
  >
    <div className="relative">
      <img 
        src={event.cover_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=450&fit=crop'} 
        alt={event.title}
        className="w-full h-48 object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      {event.highlight_tag && (
        <Badge className="absolute top-3 right-3 bg-blue-600 text-white border-blue-700">
          {event.highlight_tag}
        </Badge>
      )}
    </div>

    <div className="p-5 flex-grow flex flex-col">
      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 h-14">{event.title}</h3>
      
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <MapPin className="w-4 h-4 text-green-600" />
        <span>{event.location}</span>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {format(new Date(event.start), 'EEEE, MMMM dd, yyyy')}
      </div>

      {!isPast && new Date(event.start) > new Date() && (
        <div className="my-4">
          <SimpleCountdown targetDate={event.start} />
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
        <Link to={createPageUrl(`EventDetails?id=${event.event_id}`)}>
          <Button variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
            View Details
          </Button>
        </Link>
        {!isPast && (
          <Link to={createPageUrl(`EventRegistration?eventId=${event.event_id}`)}>
            <Button className="bg-green-600 hover:bg-green-700">
              Register Now
            </Button>
          </Link>
        )}
      </div>
    </div>
  </motion.div>
);

export default function FairAndEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const eventData = await Event.list('sort_order');
        setEvents(eventData);
      } catch (error) {
        console.error("Error loading events:", error);
      }
      setLoading(false);
    };
    loadEvents();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }
  
  const now = new Date();
  
  const sortedEvents = [...events].sort((a, b) => {
    const orderA = a.sort_order || 999;
    const orderB = b.sort_order || 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return new Date(a.start) - new Date(b.start);
  });

  const upcomingEvents = sortedEvents.filter(event => {
    const endDate = new Date(event.end);
    const isArchived = event.archive_at && new Date(event.archive_at) < now;
    return endDate >= now && !isArchived;
  });

  const pastEvents = sortedEvents.filter(event => {
    const endDate = new Date(event.end);
    const isArchived = event.archive_at && new Date(event.archive_at) < now;
    return endDate < now || isArchived;
  }).slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Fair and Events
          </h1>
          <p className="text-gray-600 text-lg">
            Connect with top institutions and education professionals at our exclusive events
          </p>
        </div>

        {upcomingEvents.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <Calendar className="text-emerald-600" />
              Upcoming Events
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <EventCard key={event.event_id} event={event} isPast={false} />
              ))}
            </div>
          </section>
        )}

        {pastEvents.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-gray-700 mb-8 flex items-center gap-3">
              <Clock className="text-gray-500" />
              Past Events
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map((event) => (
                <EventCard key={event.event_id} event={event} isPast={true} />
              ))}
            </div>
          </section>
        )}

        {events.length === 0 && (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No Events Available</h3>
            <p className="text-gray-600">
              Check back soon for upcoming educational events and fairs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
