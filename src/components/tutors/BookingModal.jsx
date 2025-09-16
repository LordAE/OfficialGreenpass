
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, DollarSign, User, Loader2 } from "lucide-react";
import { TutoringSession } from '@/api/entities';
import { User as UserEntity } from '@/api/entities';
import { useNavigate } from 'react-router-dom';

export default function BookingModal({ tutor, tutorUser, open, onOpenChange }) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [booking, setBooking] = useState(false);
  const navigate = useNavigate();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedSubject('');
      setSelectedDate(null);
      setSelectedTime('');
      setSelectedDuration(60);
    }
  }, [open]);

  const calculatePrice = () => {
    if (!tutor?.hourly_rate || !selectedDuration) return 0;
    return (tutor.hourly_rate * selectedDuration / 60).toFixed(2);
  };

  const handleBooking = async () => {
    try {
      // Check if user is logged in first
      let currentUser;
      try {
        currentUser = await UserEntity.me();
      } catch (authError) {
        // User not logged in - redirect to welcome page
        navigate('/Welcome');
        return;
      }

      // Validate form
      if (!selectedSubject || !selectedDate || !selectedTime) {
        alert('Please fill in all required fields.');
        return;
      }

      setBooking(true);
      
      // Create combined datetime
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const sessionDateTime = new Date(selectedDate);
      sessionDateTime.setHours(hours, minutes, 0, 0);
      
      // Create tutoring session
      const sessionData = {
        tutor_id: tutor.user_id,
        student_id: currentUser.id,
        subject: selectedSubject,
        scheduled_date: sessionDateTime.toISOString(),
        duration: selectedDuration,
        price: parseFloat(calculatePrice()),
        status: 'scheduled',
        payment_status: 'pending',
        session_type: 'individual'
      };
      
      console.log('Creating tutoring session:', sessionData);
      const newSession = await TutoringSession.create(sessionData);
      console.log('Session created:', newSession);
      
      // Close modal
      onOpenChange(false);
      
      // Use direct URL navigation for session checkout
      const checkoutUrl = `/Checkout?type=tutoring_session&packageId=${encodeURIComponent(newSession.id)}`;
      console.log('Direct navigation to:', checkoutUrl);
      window.location.href = checkoutUrl;
      
    } catch (error) {
      console.error('Error booking session:', error);
      alert('Failed to book session. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  // Generate time slots
  const timeSlots = [];
  for (let hour = 9; hour <= 21; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeString);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Book Session with {tutorUser?.full_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Subject Selection */}
          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {(tutor?.specializations || ['IELTS']).map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div>
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date.getDay() === 0}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div>
            <Label htmlFor="time">Time *</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map(time => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration Selection */}
          <div>
            <Label htmlFor="duration">Duration</Label>
            <Select value={selectedDuration.toString()} onValueChange={(value) => setSelectedDuration(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Display */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-semibold">Total Price:</span>
            </div>
            <span className="text-xl font-bold text-green-600">
              ${calculatePrice()}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={booking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBooking}
              disabled={booking || !selectedSubject || !selectedDate || !selectedTime}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {booking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Book Session
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
