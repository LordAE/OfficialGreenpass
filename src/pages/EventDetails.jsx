
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Event } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Users, CheckSquare, DollarSign, PlusCircle, ArrowLeft, Star, Globe, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import YouTubeEmbed from '../components/YouTubeEmbed';
import Countdown from '../components/events/Countdown';
import { createPageUrl } from '@/utils';

export default function EventDetails() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('id');
        
        if (eventId) {
          const events = await Event.filter({ event_id: eventId });
          if (events.length > 0) {
            setEvent(events[0]);
          }
        }
      } catch (error) {
        console.error("Error loading event:", error);
      }
      setLoading(false);
    };

    loadEvent();
  }, []);

  const handleBackClick = () => {
    navigate(-1); // Go back to previous page
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
          <Link to={createPageUrl('Events')}>
            <Button>Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isEventFree = !event.registration_tiers || event.registration_tiers.every(t => t.price_usd === 0);
  const isUpcomingEvent = new Date(event.start) > new Date(); // Renamed from isUpcoming

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button 
            variant="ghost" 
            onClick={handleBackClick}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event Details
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Event Header */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {event.cover_image ? (
                <div className="relative h-64 md:h-80">
                  <img 
                    src={event.cover_image} 
                    alt={`${event.title} cover`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-6 left-6 text-white">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.title}</h1>
                    <div className="flex items-center gap-4 text-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        <span>{format(new Date(event.start), 'MMMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8">
                  <h1 className="text-3xl md:text-4xl font-bold mb-4">{event.title}</h1>
                  <div className="flex items-center gap-6 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <span>{format(new Date(event.start), 'MMMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Countdown Timer for Upcoming Events */}
            {isUpcomingEvent && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Event Countdown</h3>
                  <Countdown targetDate={event.start} />
                </div>
              </div>
            )}
            
            {/* Event Description */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-2xl">About This Event</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                {event.introduction ? (
                  <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                    {event.introduction}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No description provided for this event.</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Ready to Join?</h3>
                    <p className="text-gray-600">Secure your spot at this exclusive event</p>
                  </div>
                  <Link to={createPageUrl(`EventRegistration?eventId=${event.event_id}`)}>
                    <Button size="lg" className="bg-green-600 hover:bg-green-700 shadow-lg min-w-[180px]">
                      <PlusCircle className="w-5 h-5 mr-2" />
                      Register Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Promo Video */}
            {event.promo_video_url && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-2xl">Event Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <YouTubeEmbed url={event.promo_video_url} className="w-full aspect-video rounded-lg shadow-md" />
                </CardContent>
              </Card>
            )}

            {/* Event Inclusions */}
            {event.fair_inclusions && event.fair_inclusions.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-2xl">What's Included</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid md:grid-cols-2 gap-3">
                    {event.fair_inclusions.map((inclusion, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckSquare className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <span className="text-gray-700">{inclusion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {event.gallery_images && event.gallery_images.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-2xl">Event Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {event.gallery_images.map((img, index) => (
                      <a key={index} href={img} target="_blank" rel="noopener noreferrer" className="group">
                        <img 
                          src={img} 
                          alt={`Gallery image ${index + 1}`} 
                          className="w-full h-32 object-cover rounded-lg shadow-md group-hover:scale-105 transition-transform duration-200" 
                        />
                      </a>
                    ))}
                  </div>
                  {event.media_attribution && (
                    <p className="text-sm text-gray-500 mt-4 italic">{event.media_attribution}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Registration Tiers & Info */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Event Info */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Event Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{format(new Date(event.start), 'EEEE, MMMM dd, yyyy')}</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{event.location}</p>
                  </div>
                </div>
                
                {event.contact_details?.email && (
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm">Contact: {event.contact_details.email}</p>
                      {event.contact_details.phone && (
                        <p className="text-sm">{event.contact_details.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Registration Tiers */}
            {event.registration_tiers && event.registration_tiers.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-xl">Registration Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.registration_tiers.map(tier => (
                    <div key={tier.key} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-lg">{tier.name}</h4>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">${tier.price_usd}</div>
                          <div className="text-sm text-gray-500">USD</div>
                        </div>
                      </div>
                      
                      {tier.description && (
                        <p className="text-gray-600 text-sm mb-3">{tier.description}</p>
                      )}
                      
                      {tier.benefits && tier.benefits.length > 0 && (
                        <ul className="space-y-1">
                          {tier.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckSquare className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
