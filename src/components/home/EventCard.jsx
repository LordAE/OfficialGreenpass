import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';

export default function EventCard({ event }) {
  const isFree = !event.registration_tiers || event.registration_tiers.every(t => t.price_usd === 0);

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
        <div className="relative">
            <Link to={createPageUrl(`EventDetails?id=${event.event_id}`)} className="block">
                <img 
                    src={event.cover_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop'} 
                    alt={event.title} 
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform" 
                />
            </Link>
            <div className="absolute top-2 left-2 flex flex-wrap gap-2">
                {isFree && <Badge className="bg-green-600 text-white border-transparent">Free</Badge>}
                {event.highlight_tag && <Badge className="bg-blue-600 text-white border-transparent">{event.highlight_tag}</Badge>}
            </div>
        </div>
        <CardHeader>
            <CardTitle className="text-lg font-bold line-clamp-2">
                <Link to={createPageUrl(`EventDetails?id=${event.event_id}`)} className="hover:text-green-700">{event.title}</Link>
            </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <div className="flex items-center text-sm text-gray-500 mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{format(new Date(event.start), 'MMMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{event.location}</span>
            </div>
        </CardContent>
        <div className="p-6 pt-0">
            <Link to={createPageUrl(`EventDetails?id=${event.event_id}`)}>
                <Button className="w-full" variant="outline">
                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </Link>
        </div>
    </Card>
  );
}