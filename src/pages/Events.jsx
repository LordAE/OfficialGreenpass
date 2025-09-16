
import React, { useState, useEffect } from 'react';
import { Event } from '@/api/entities';
import { HomePageContent } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // New import
import { Calendar, MapPin, ArrowRight } from 'lucide-react'; // Updated import for Calendar, MapPin, ArrowRight
import { format } from 'date-fns'; // New import
import { Link } from 'react-router-dom'; // New import
import { createPageUrl } from '@/components/URLRedirect'; // New import
import { getText } from '@/pages/Layout'; // New import
import YouTubeEmbed from '../components/YouTubeEmbed'; // Keep existing import, even if not directly used in EventCard or EventsPage below

// New EventCard component definition (replaces the imported one)
const EventCard = ({ event }) => (
  <Card className="hover:shadow-lg transition-shadow duration-300 flex flex-col group">
    <div className="overflow-hidden rounded-t-lg h-48">
      <img
        src={event.cover_image || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80'}
        alt={event.title}
        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
      />
    </div>
    <CardContent className="p-6 flex flex-col flex-grow">
      <h3 className="font-bold text-lg text-gray-900 mb-2 h-14 overflow-hidden">{event.title}</h3>
      <div className="flex items-center text-sm text-gray-500 mb-2">
        <Calendar className="w-4 h-4 mr-2" />
        {format(new Date(event.start), 'MMMM dd, yyyy')}
      </div>
      <div className="flex items-center text-sm text-gray-500 mb-4">
        <MapPin className="w-4 h-4 mr-2" />
        {event.location}
      </div>
      <div className="mt-auto">
        <Link to={createPageUrl(`EventDetails?id=${event.event_id}`)}>
          <Button variant="outline" className="w-full group-hover:bg-green-600 group-hover:text-white transition-colors">
            {getText('View Details')} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </CardContent>
  </Card>
);

const PageSkeleton = () => (
    <div className="animate-pulse">
        <div className="h-64 bg-gray-200"></div>
        <div className="max-w-7xl mx-auto py-12 px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
                ))}
            </div>
        </div>
    </div>
);

export default function EventsPage() { // Changed function name from Events to EventsPage
  const [events, setEvents] = useState([]);
  const [pageContent, setPageContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [eventData, contentData] = await Promise.all([
            Event.list('sort_order'), // Sort by sort_order only
            HomePageContent.filter({ singleton_key: "SINGLETON" })
        ]);
        
        setEvents(eventData);

        if (contentData.length > 0) {
            setPageContent(contentData[0].events_page_section);
        } else {
             setPageContent({ // Fallback content
                title: "Fairs and Events",
                subtitle: "Join our premier international education fairs, workshops, and seminars.",
                header_image_url: "https://images.unsplash.com/photo-1560439514-4e280ea57c89?w=1920&h=400&fit=crop&q=80"
             });
        }

      } catch (error) {
        console.error("Error loading events page data:", error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return <PageSkeleton />;
  }
  
  const now = new Date();
  
  // Sort events: first by sort_order, then by start date
  const sortedEvents = [...events].sort((a, b) => {
    // First sort by sort_order (lower numbers first)
    const orderA = a.sort_order || 999;
    const orderB = b.sort_order || 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // Then sort by start date for events with same sort_order
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
  }).slice(0, 6); // Show up to 6 past events

  return (
    <div className="min-h-screen bg-gray-50">
        {pageContent && (
            <div className="relative bg-gray-800">
                <img src={pageContent.header_image_url} alt="Events background" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 text-center text-white">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{pageContent.title}</h1>
                    <p className="mt-6 max-w-3xl mx-auto text-xl">{pageContent.subtitle}</p>
                </div>
            </div>
        )}
      <div className="max-w-7xl mx-auto py-12 px-6">
        {upcomingEvents.length > 0 ? (
          <div className="space-y-16">
            <div>
              <h2 className="text-3xl font-bold text-center mb-10">Upcoming Events</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcomingEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>

            {pastEvents.length > 0 && (
               <div>
                <h2 className="text-3xl font-bold text-center mb-10">Past Events</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {pastEvents.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-gray-600">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Upcoming Events</h3>
              <p className="mt-1 text-sm text-gray-500">
                There are no upcoming events at this time. Please check back later.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
