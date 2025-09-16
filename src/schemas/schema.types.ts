// GENERATED from CSV headers (best-effort)

export interface AboutPageContent {
  id?: string; // Firestore doc id
}

export interface AgentPackage {
  id?: string; // Firestore doc id
  created_by_id?: string;
  created_date?: string;
  description?: string;
  icon?: string;
  id?: string;
  is_sample?: null;
  key_benefits?: any[] | null;
  name?: string;
  notes?: string;
  popular?: boolean | null;
  price_yearly?: number | null;
  updated_date?: string;
}

export interface Agent {
  id?: string; // Firestore doc id
}

export interface Asset {
  id?: string; // Firestore doc id
  alt?: string;
  created_by_id?: string;
  created_date?: string;
  credit?: string;
  height?: number;
  id?: string;
  is_sample?: null;
  license?: string;
  sourceUrl?: string;
  tags?: any[];
  thumbUrl?: string;
  title?: string;
  updated_date?: string;
  url?: string;
  width?: number;
}

export interface BankSetting {
  id?: string; // Firestore doc id
  account_number?: string | number | null;
  active?: boolean;
  bank_name?: string | null;
  beneficiary_address?: string | null;
  beneficiary_name?: string | null;
  branch_address?: string | null;
  branch_transit?: number | null;
  charges_option?: string;
  country?: string;
  created_by_id?: string;
  created_date?: string;
  currency?: string;
  id?: string;
  institution_number?: number | null;
  instructions?: string;
  is_sample?: null;
  swift_bic?: string | null;
  updated_date?: string;
}

export interface BrandSetting {
  id?: string; // Firestore doc id
  company_name?: string;
  created_by_id?: string;
  created_date?: string;
  favicon_url?: null;
  footer_text?: string;
  id?: string;
  is_sample?: null;
  logo_dark_url?: null;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  singleton_key?: string;
  tagline?: string;
  updated_date?: string;
}

export interface Case {
  id?: string; // Firestore doc id
}

export interface ChatSetting {
  id?: string; // Firestore doc id
  created_by_id?: string;
  created_date?: string;
  id?: string;
  is_sample?: null;
  singleton_key?: string;
  updated_date?: string;
  whatsapp_number?: string;
  zalo_number?: string;
}

export interface ContactPageContent {
  id?: string; // Firestore doc id
  address?: string;
  created_by_id?: string;
  created_date?: string;
  email?: string;
  form_title?: string;
  hero_subtitle?: string;
  hero_title?: string;
  id?: string;
  info_title?: string;
  is_sample?: null;
  office_hours_canada?: string;
  office_hours_title?: string;
  office_hours_vietnam?: string;
  phone?: string;
  singleton_key?: string;
  updated_date?: string;
}

export interface Contact {
  id?: string; // Firestore doc id
}

export interface Conversation {
  id?: string; // Firestore doc id
}

export interface EventAssignment {
  id?: string; // Firestore doc id
  assigned_by?: string;
  assigned_role?: string;
  created_by_id?: string;
  created_date?: string;
  event_id?: string;
  id?: string;
  is_sample?: null;
  notes?: null;
  permissions?: any[];
  status?: string;
  updated_date?: string;
  user_id?: string;
}

export interface EventRegistration {
  id?: string; // Firestore doc id
}

export interface Event {
  id?: string; // Firestore doc id
  additional_activities?: any[];
  archive_at?: string;
  bank_details?: null;
  contact_details?: Record<string, any>;
  cover_image?: string | null;
  created_by_id?: string;
  created_date?: string;
  end?: string;
  event_id?: string;
  exhibitor_notes?: string | null;
  fair_inclusions?: any[];
  gallery_images?: any[];
  id?: string;
  introduction?: string;
  is_sample?: null;
  location?: string;
  media_attribution?: null;
  nasio_checkout_url?: null;
  payment_information?: null;
  promo_video?: null;
  promo_video_url?: string | null;
  promotion_plan?: Record<string, any>;
  refund_50_by?: null;
  refund_none_after?: null;
  registration_close?: null;
  registration_form_fields?: any[];
  registration_tiers?: any[];
  shipping_address?: string | null;
  shipping_deadline?: string | null;
  start?: string;
  timezone?: string;
  title?: string;
  updated_date?: string;
}

export interface ExhibitorRegistration {
  id?: string; // Firestore doc id
  amount?: number;
  bank_proof_url?: string | null;
  booth_number?: string | null;
  checked_in?: boolean | null;
  contact_email?: string;
  contact_name?: string;
  created_by_id?: string;
  created_date?: string;
  currency?: string;
  event_id?: string;
  id?: string;
  is_sample?: null;
  payment_method?: string;
  phone?: string;
  school_name?: string;
  status?: string;
  ticket_qr_url?: string | null;
  updated_date?: string;
  user_id?: string;
}

export interface FairEvent {
  id?: string; // Firestore doc id
  city?: string;
  country?: string;
  created_by_id?: string;
  created_date?: string;
  description?: string;
  endDate?: string;
  id?: string;
  imageUrl?: string;
  isFree?: null;
  isHybrid?: null;
  isOnline?: boolean | null;
  isWorkshop?: null;
  is_sample?: null;
  partnershipOpportunities?: null;
  registrationClosed?: null;
  registrationUrl?: string;
  sponsorshipPackages?: null;
  startDate?: string;
  status?: string;
  title?: string;
  updated_date?: string;
  venue?: string;
}

export interface Faq {
  id?: string; // Firestore doc id
  body?: string;
  category?: string;
  created_by_id?: string;
  created_date?: string;
  faq_id?: string;
  id?: string;
  is_sample?: null;
  lang?: string;
  priority?: number | null;
  tags?: any[];
  title?: string;
  updated_date?: string;
}

export interface HomePageContent {
  id?: string; // Firestore doc id
  created_by_id?: string;
  created_date?: string;
  events_page_section?: null;
  features_section?: any[];
  hero_section?: Record<string, any>;
  id?: string;
  is_sample?: null;
  singleton_key?: string;
  stats_section?: any[];
  testimonials_section?: any[];
  updated_date?: string;
}

export interface Institution {
  id?: string; // Firestore doc id
}

export interface KnowledgeBase {
  id?: string; // Firestore doc id
  body?: string;
  category?: string;
  created_by_id?: string;
  created_date?: string;
  id?: string;
  is_sample?: null;
  kb_id?: string;
  lang?: string;
  sources?: any[];
  summary?: string;
  tags?: any[];
  title?: string;
  updated_date?: string;
}

export interface Lead {
  id?: string; // Firestore doc id
}

export interface MarketplaceOrder {
  id?: string; // Firestore doc id
}

export interface Message {
  id?: string; // Firestore doc id
}

export interface Payment {
  id?: string; // Firestore doc id
}

export interface Post {
  id?: string; // Firestore doc id
  author?: string;
  category?: string;
  content?: string;
  coverImageUrl?: string;
  created_by_id?: string;
  created_date?: string;
  excerpt?: string;
  id?: string;
  isFeatured?: boolean | null;
  is_sample?: null;
  readTime?: string;
  title?: string;
  updated_date?: string;
}

export interface Program {
  id?: string; // Firestore doc id
  admission_requirements?: string | null;
  created_by_id?: string;
  created_date?: string;
  duration?: string;
  id?: string;
  intake_details?: string | null;
  is_sample?: null;
  level?: string;
  next_intake?: string;
  overview?: string;
  schoolCity?: null;
  schoolLogoUrl?: null;
  schoolName?: string;
  schoolProvince?: null;
  title?: string;
  tuition?: number;
  tuition_and_fees_details?: string | null;
  updated_date?: string;
}

export interface Registration {
  id?: string; // Firestore doc id
}

export interface Reservation {
  id?: string; // Firestore doc id
}

export interface School {
  id?: string; // Firestore doc id
  about?: string;
  acceptance_rate?: number;
  address?: string | null;
  application_fee?: number | null;
  cost_of_living?: number | null;
  country?: string;
  created_by_id?: string;
  created_date?: string;
  founded_year?: number | null;
  id?: string;
  image_url?: string | null;
  is_sample?: null;
  location?: string;
  name?: string;
  programs?: any[];
  rating?: number;
  tuition_fees?: number | null;
  updated_date?: string;
  website?: string | null;
}

export interface Service {
  id?: string; // Firestore doc id
  category?: string;
  created_by_id?: string;
  created_date?: string;
  description?: string | null;
  id?: string;
  image_url?: string | null;
  is_sample?: null;
  name?: string;
  price_usd?: number;
  status?: string;
  updated_date?: string;
  vendor_id?: string;
}

export interface StudentRsvp {
  id?: string; // Firestore doc id
}

export interface StudentTutorPackage {
  id?: string; // Firestore doc id
  created_by_id?: string;
  created_date?: string;
  icon?: string;
  id?: string;
  is_sample?: null;
  key_benefits?: any[];
  name?: string;
  num_sessions?: number;
  price_display?: string;
  price_usd?: number | null;
  target_user?: string;
  updated_date?: string;
}

export interface SupportAgent {
  id?: string; // Firestore doc id
}

export interface SupportTicket {
  id?: string; // Firestore doc id
}

export interface TutoringSession {
  id?: string; // Firestore doc id
}

export interface TutorPackage {
  id?: string; // Firestore doc id
  commission_rate?: number;
  created_by_id?: string;
  created_date?: string;
  icon?: string;
  id?: string;
  is_sample?: null;
  key_benefits?: any[];
  name?: string;
  popular?: boolean | null;
  price_cad_monthly?: number | null;
  updated_date?: string;
}

export interface Tutor {
  id?: string; // Firestore doc id
}

export interface Vendor {
  id?: string; // Firestore doc id
  business_license_url?: null;
  business_name?: string;
  created_by_id?: string;
  created_date?: string;
  id?: string;
  is_sample?: null;
  rating?: number | null;
  service_categories?: any[];
  updated_date?: string;
  user_id?: string;
  verification_status?: string;
}

export interface VisaDocument {
  id?: string; // Firestore doc id
}

export interface VisaPackage {
  id?: string; // Firestore doc id
  country?: string;
  created_by_id?: string;
  created_date?: string;
  description?: string;
  doc_requirements?: any[];
  features?: any[];
  icon?: string;
  id?: string;
  is_sample?: null;
  name?: string;
  popular?: boolean | null;
  price?: number;
  processingTime?: string;
  successRate?: string;
  supportLevel?: string;
  updated_date?: string;
  upload_tips?: any[];
}

export interface VisaRequest {
  id?: string; // Firestore doc id
}

export interface WalletTransaction {
  id?: string; // Firestore doc id
}

export interface Wallet {
  id?: string; // Firestore doc id
}