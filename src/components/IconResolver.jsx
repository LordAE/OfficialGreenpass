import React from 'react';
import {
  BookOpen,
  Handshake,
  Users,
  Star,
  CheckCircle,
  Play,
  MapPin,
  Clock,
  Globe,
  ArrowRight,
  Calendar,
  School,
  GraduationCap
} from 'lucide-react';

// A mapping of all icons you intend to use dynamically from the CMS.
// Add any new icon names from lucide-react here.
const iconMap = {
  BookOpen,
  Handshake,
  Users,
  Star,
  CheckCircle,
  Play,
  MapPin,
  Clock,
  Globe,
  ArrowRight,
  Calendar,
  School,
  GraduationCap
};

// Default fallback icon
const FallbackIcon = Star;

const IconResolver = ({ name, ...props }) => {
  const IconComponent = iconMap[name] || FallbackIcon;
  return <IconComponent {...props} />;
};

export default IconResolver;