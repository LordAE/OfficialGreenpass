// src/pages/UserDetails.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Agent, School, Tutor, TutoringSession, Case } from "@/api/entities"; // Case kept if you later add support

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Briefcase,
  BookOpen,
  Building,
  MapPin,
  Globe,
  DollarSign,
  Calendar,
  Star,
  Clock,
  CheckCircle,
  Video,
  GraduationCap,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { format } from "date-fns";

/* ----------------------- i18n helpers ----------------------- */

function tOr(t, key, fallback) {
  try {
    const v = t(key, { defaultValue: fallback });
    return v ?? fallback;
  } catch {
    try {
      return t(key, fallback);
    } catch {
      return fallback;
    }
  }
}

function statusLabel(t, status) {
  const s = String(status || "").toLowerCase();
  const map = {
    completed: tOr(t, "Completed", "Completed"),
    upcoming: tOr(t, "Upcoming", "Upcoming"),
    scheduled: tOr(t, "Scheduled", "Scheduled"),
    cancelled: tOr(t, "userDetails.statusCancelled", "Cancelled"),
    missed: tOr(t, "userDetails.statusMissed", "Missed"),
    pending: tOr(t, "pending", "Pending"),
    verified: tOr(t, "verified", "Verified"),
    unverified: tOr(t, "userDetails.statusUnverified", "Unverified"),
  };
  return map[s] || status || "—";
}

function moneyUSD(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "N/A";
  return `$${n.toLocaleString()}`;
}

function badgeClassForStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "bg-green-100 text-green-800";
  if (s === "scheduled") return "bg-blue-100 text-blue-800";
  if (s === "cancelled") return "bg-red-100 text-red-800";
  if (s === "missed") return "bg-orange-100 text-orange-800";
  if (s === "verified") return "bg-green-100 text-green-800";
  if (s === "pending") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}

/* ----------------------- School Details ----------------------- */

const SchoolDetails = ({ schoolData }) => {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="info" className="space-y-6">
      <TabsList className="grid grid-cols-2 bg-red-100">
        <TabsTrigger value="info">{tOr(t, "userDetails.schoolInfoTab", "School Info")}</TabsTrigger>
        <TabsTrigger value="students">{tOr(t, "userDetails.enrolledStudentsTab", "Enrolled Students")}</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              {tOr(t, "userDetails.schoolInformationTitle", "School Information")}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {tOr(t, "userDetails.schoolNameLabel", "School Name")}
                </label>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{schoolData?.name || "N/A"}</p>
                  {schoolData?.account_type === "dummy" ? (
                    <Badge variant="secondary">{tOr(t, "Dummy", "Dummy")}</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800">{tOr(t, "Real", "Real")}</Badge>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  {tOr(t, "userDetails.foundedYearLabel", "Founded Year")}
                </label>
                <p className="font-semibold">{schoolData?.founded_year || "N/A"}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">{tOr(t, "location", "Location")}</label>
                <p className="font-semibold flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {[schoolData?.location, schoolData?.country].filter(Boolean).join(", ") || "N/A"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">{tOr(t, "website", "Website")}</label>
                <p className="font-semibold flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  {schoolData?.website ? (
                    <a
                      href={schoolData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {schoolData.website}
                    </a>
                  ) : (
                    "N/A"
                  )}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  {tOr(t, "userDetails.annualTuitionUsdLabel", "Annual Tuition (USD)")}
                </label>
                <p className="font-semibold text-green-600">
                  {typeof schoolData?.tuition_fees === "number" ? moneyUSD(schoolData.tuition_fees) : "N/A"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  {tOr(t, "userDetails.verificationStatusLabel", "Verification Status")}
                </label>
                <Badge className={badgeClassForStatus(schoolData?.verification_status)}>
                  {statusLabel(t, schoolData?.verification_status || "pending")}
                </Badge>
              </div>
            </div>

            {schoolData?.about && (
              <div>
                <label className="text-sm font-medium text-gray-600">{tOr(t, "about", "About")}</label>
                <p className="text-gray-700 mt-1">{schoolData.about}</p>
              </div>
            )}

            {Array.isArray(schoolData?.programs) && schoolData.programs.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {tOr(t, "userDetails.programsLabel", "Programs")} ({schoolData.programs.length})
                </label>
                <div className="grid gap-3 mt-2">
                  {schoolData.programs.map((program, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{program.name}</p>
                          <p className="text-sm text-gray-600">
                            {[program.level, program.duration].filter(Boolean).join(" - ") || "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            {typeof program.tuition_per_year === "number"
                              ? `${moneyUSD(program.tuition_per_year)}/${tOr(t, "userDetails.perYear", "year")}`
                              : "—"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {typeof program.available_seats === "number"
                              ? `${program.available_seats} ${tOr(t, "userDetails.seats", "seats")}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="students">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {tOr(t, "userDetails.enrolledStudentsTitle", "Enrolled Students")}
            </CardTitle>
            <CardDescription>
              {tOr(
                t,
                "userDetails.enrolledStudentsDesc",
                "This section requires a `User` query helper (not available in your current `entities.js`). Add a backend query or persist student snapshots on enrollments to enable this list."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{tOr(t, "userDetails.noEnrolledStudents", "No enrolled students available with the current API.")}</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

/* ----------------------- Agent Details ----------------------- */

const AgentDetails = ({ agentData }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            {tOr(t, "userDetails.agentInformationTitle", "Agent Information")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.companyNameLabel", "Company Name")}</label>
              <p className="font-semibold">{agentData?.company_name || "N/A"}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.businessLicenseMstLabel", "Business License (MST)")}</label>
              <p className="font-semibold">{agentData?.business_license_mst || "N/A"}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.yearEstablishedLabel", "Year Established")}</label>
              <p className="font-semibold">{agentData?.year_established || "N/A"}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.referralCodeLabel", "Referral Code")}</label>
              <p className="font-semibold text-blue-600">{agentData?.referral_code || "N/A"}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.commissionRateLabel", "Commission Rate")}</label>
              <p className="font-semibold text-green-600">
                {typeof agentData?.commission_rate === "number" ? `${(agentData.commission_rate * 100).toFixed(1)}%` : "N/A"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.verificationStatusLabel", "Verification Status")}</label>
              <Badge className={badgeClassForStatus(agentData?.verification_status)}>
                {statusLabel(t, agentData?.verification_status || "pending")}
              </Badge>
            </div>
          </div>

          {agentData?.contact_person && (
            <div>
              <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.contactPersonLabel", "Contact Person")}</label>
              <div className="bg-gray-50 p-3 rounded-lg mt-1">
                <p className="font-medium">{agentData.contact_person.name}</p>
                <p className="text-sm text-gray-600">{agentData.contact_person.title}</p>
                <p className="text-sm text-gray-600">{agentData.contact_person.email}</p>
                <p className="text-sm text-gray-600">{agentData.contact_person.phone}</p>
              </div>
            </div>
          )}

          {Array.isArray(agentData?.services_offered) && agentData.services_offered.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.servicesOfferedLabel", "Services Offered")}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {agentData.services_offered.map((service, index) => (
                  <Badge key={index} variant="outline">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(agentData?.target_countries) && agentData.target_countries.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.targetCountriesLabel", "Target Countries")}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {agentData.target_countries.map((country, index) => (
                  <Badge key={index} variant="outline">
                    {country}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{moneyUSD(agentData?.total_earned || 0)}</p>
              <p className="text-sm text-gray-600">{tOr(t, "userDetails.totalEarned", "Total Earned")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{moneyUSD(agentData?.pending_payout || 0)}</p>
              <p className="text-sm text-gray-600">{tOr(t, "userDetails.pendingPayout", "Pending Payout")}</p>
            </div>
            <div className="text-center">
              <Badge className={badgeClassForStatus(agentData?.payout_status)}>{statusLabel(t, agentData?.payout_status || "none")}</Badge>
              <p className="text-sm text-gray-600 mt-1">{tOr(t, "userDetails.payoutStatus", "Payout Status")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ----------------------- Tutor Details ----------------------- */

const TutorDetails = ({ tutorData, sessions }) => {
  const { t } = useTranslation();

  const completedSessions = sessions.filter((s) => String(s.status || "").toLowerCase() === "completed");
  const upcomingSessions = sessions.filter(
    (s) => String(s.status || "").toLowerCase() === "scheduled" && new Date(s.scheduled_date) > new Date()
  );

  return (
    <Tabs defaultValue="info" className="space-y-6">
      <TabsList className="grid grid-cols-3 bg-purple-100">
        <TabsTrigger value="info">{tOr(t, "userDetails.tutorInfoTab", "Tutor Info")}</TabsTrigger>
        <TabsTrigger value="sessions">{tOr(t, "Sessions", "Sessions")}</TabsTrigger>
        <TabsTrigger value="earnings">{tOr(t, "Earnings", "Earnings")}</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {tOr(t, "userDetails.tutorInformationTitle", "Tutor Information")}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">{tOr(t, "Experience", "Experience")}</label>
                <p className="font-semibold">
                  {tutorData?.experience_years || 0} {tOr(t, "userDetails.years", "years")}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.hourlyRate", "Hourly Rate")}</label>
                <p className="font-semibold text-green-600">
                  {moneyUSD(tutorData?.hourly_rate || 0)}/{tOr(t, "userDetails.perHour", "hour")}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">{tOr(t, "Rating", "Rating")}</label>
                <p className="font-semibold flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  {tutorData?.rating || tOr(t, "userDetails.noRatingsYet", "No ratings yet")}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.totalStudents", "Total Students")}</label>
                <p className="font-semibold">{tutorData?.total_students || 0}</p>
              </div>
            </div>

            {Array.isArray(tutorData?.specializations) && tutorData.specializations.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">{tOr(t, "Specializations", "Specializations")}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tutorData.specializations.map((spec, index) => (
                    <Badge key={index} className="bg-purple-100 text-purple-800">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(tutorData?.qualifications) && tutorData.qualifications.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">{tOr(t, "Qualifications", "Qualifications")}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tutorData.qualifications.map((qual, index) => (
                    <Badge key={index} variant="outline">
                      {qual}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(tutorData?.languages) && tutorData.languages.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">{tOr(t, "Languages", "Languages")}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tutorData.languages.map((lang, index) => (
                    <Badge key={index} variant="outline">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {tutorData?.bio && (
              <div>
                <label className="text-sm font-medium text-gray-600">{tOr(t, "Bio", "Bio")}</label>
                <p className="text-gray-700 mt-1">{tutorData.bio}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-600">{tOr(t, "userDetails.verificationStatusLabel", "Verification Status")}</label>
              <Badge className={badgeClassForStatus(tutorData?.verification_status)}>{statusLabel(t, tutorData?.verification_status || "pending")}</Badge>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sessions">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {tOr(t, "userDetails.tutoringSessionsTitle", "Tutoring Sessions")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {sessions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tOr(t, "student", "Student")}</TableHead>
                    <TableHead>{tOr(t, "Subject", "Subject")}</TableHead>
                    <TableHead>{tOr(t, "userDetails.dateTime", "Date & Time")}</TableHead>
                    <TableHead>{tOr(t, "Duration", "Duration")}</TableHead>
                    <TableHead>{tOr(t, "Price", "Price")}</TableHead>
                    <TableHead>{tOr(t, "Status", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sessions.slice(0, 10).map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        {session.student_full_name ||
                          `${tOr(t, "student", "Student")} ${String(session.student_id || "").slice(-4) || ""}`}
                      </TableCell>
                      <TableCell>{session.subject}</TableCell>
                      <TableCell>
                        <div>
                          <div>{session.scheduled_date ? format(new Date(session.scheduled_date), "MMM dd, yyyy") : "—"}</div>
                          <div className="text-sm text-gray-500">{session.scheduled_date ? format(new Date(session.scheduled_date), "hh:mm a") : ""}</div>
                        </div>
                      </TableCell>
                      <TableCell>{typeof session.duration === "number" ? `${session.duration} ${tOr(t, "userDetails.minutes", "min")}` : "—"}</TableCell>
                      <TableCell className="font-medium">{typeof session.price === "number" ? `$${session.price}` : "—"}</TableCell>
                      <TableCell>
                        <Badge className={badgeClassForStatus(session.status)}>{statusLabel(t, session.status || "—")}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">{tOr(t, "userDetails.noSessionsFound", "No sessions found")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="earnings">
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">${completedSessions.reduce((sum, s) => sum + (s.price || 0), 0)}</div>
                    <p className="text-gray-600 text-sm">{tOr(t, "userDetails.totalEarned", "Total Earned")}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{sessions.length}</div>
                    <p className="text-gray-600 text-sm">{tOr(t, "userDetails.totalSessions", "Total Sessions")}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{completedSessions.length}</div>
                    <p className="text-gray-600 text-sm">{tOr(t, "Completed", "Completed")}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{upcomingSessions.length}</div>
                    <p className="text-gray-600 text-sm">{tOr(t, "Upcoming", "Upcoming")}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{tOr(t, "userDetails.earningHistoryTitle", "Earning History")}</CardTitle>
            </CardHeader>

            <CardContent>
              {completedSessions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tOr(t, "Date", "Date")}</TableHead>
                      <TableHead>{tOr(t, "Subject", "Subject")}</TableHead>
                      <TableHead>{tOr(t, "Duration", "Duration")}</TableHead>
                      <TableHead>{tOr(t, "userDetails.earnings", "Earnings")}</TableHead>
                      <TableHead>{tOr(t, "Rating", "Rating")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {completedSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{session.scheduled_date ? format(new Date(session.scheduled_date), "MMM dd, yyyy") : "—"}</TableCell>
                        <TableCell>{session.subject || "—"}</TableCell>
                        <TableCell>{typeof session.duration === "number" ? `${session.duration} ${tOr(t, "userDetails.minutes", "min")}` : "—"}</TableCell>
                        <TableCell className="font-semibold text-green-600">{typeof session.price === "number" ? `$${session.price}` : "—"}</TableCell>
                        <TableCell>
                          {typeof session.student_rating === "number" ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span>{session.student_rating}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">{tOr(t, "userDetails.noRating", "No rating")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">{tOr(t, "userDetails.noEarningsYet", "No earnings yet")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};

/* ----------------------- Student Details ----------------------- */

const StudentDetails = ({ sessions }) => {
  const { t } = useTranslation();

  const upcomingSessions = sessions.filter(
    (s) => String(s.status || "").toLowerCase() === "scheduled" && new Date(s.scheduled_date) > new Date()
  );

  const pastSessions = sessions.filter((s) => {
    const st = String(s.status || "").toLowerCase();
    return st === "completed" || st === "cancelled" || st === "missed" || (st === "scheduled" && new Date(s.scheduled_date) <= new Date());
  });

  return (
    <Tabs defaultValue="sessions" className="space-y-6">
      <TabsList className="grid grid-cols-2 bg-blue-100">
        <TabsTrigger value="sessions">{tOr(t, "userDetails.tutorSessionsTab", "Tutor Sessions")}</TabsTrigger>
        <TabsTrigger value="agent" disabled>{tOr(t, "userDetails.agentManagementTab", "Agent Management")}</TabsTrigger>
      </TabsList>

      <TabsContent value="sessions">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {tOr(t, "userDetails.upcomingSessionsTitle", "Upcoming Sessions")}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {upcomingSessions.length > 0 ? (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <div key={session.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{session.subject || "—"}</p>
                          <p className="text-sm text-gray-600">
                            {tOr(t, "tutor", "Tutor")}:{" "}
                            {session.tutor_full_name || `${tOr(t, "tutor", "Tutor")} ${String(session.tutor_id || "").slice(-4)}`}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {session.scheduled_date ? format(new Date(session.scheduled_date), "MMM dd, yyyy") : "—"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.scheduled_date ? format(new Date(session.scheduled_date), "hh:mm a") : ""}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge className="bg-blue-100 text-blue-800 mb-2">{statusLabel(t, "scheduled")}</Badge>

                          {session.meeting_link && (
                            <div>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
                                <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                                  <Video className="w-4 h-4 mr-1" />
                                  {tOr(t, "Join", "Join")}
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">{tOr(t, "userDetails.noUpcomingSessions", "No upcoming sessions")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {tOr(t, "userDetails.pastSessionsTitle", "Past Sessions")}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {pastSessions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tOr(t, "Date", "Date")}</TableHead>
                      <TableHead>{tOr(t, "tutor", "Tutor")}</TableHead>
                      <TableHead>{tOr(t, "Subject", "Subject")}</TableHead>
                      <TableHead>{tOr(t, "Status", "Status")}</TableHead>
                      <TableHead>{tOr(t, "Rating", "Rating")}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {pastSessions.slice(0, 10).map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{session.scheduled_date ? format(new Date(session.scheduled_date), "MMM dd, yyyy") : "—"}</TableCell>
                        <TableCell>{session.tutor_full_name || `${tOr(t, "tutor", "Tutor")} ${String(session.tutor_id || "").slice(-4)}`}</TableCell>
                        <TableCell>{session.subject || "—"}</TableCell>
                        <TableCell>
                          <Badge className={badgeClassForStatus(session.status)}>{statusLabel(t, session.status || "—")}</Badge>
                        </TableCell>
                        <TableCell>
                          {typeof session.student_rating === "number" ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span>{session.student_rating}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">{tOr(t, "userDetails.noRating", "No rating")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">{tOr(t, "userDetails.noPastSessions", "No past sessions")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="agent">
        <Card>
          <CardHeader>
            <CardTitle>{tOr(t, "userDetails.agentManagementTitle", "Agent Management")}</CardTitle>
            <CardDescription>{tOr(t, "userDetails.agentManagementDesc", "Reassignment requires backend support (no `User.update` in current API).")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              {tOr(t, "userDetails.agentManagementBody", "To enable this, add a `User` entity with `.get(id)`, `.filter()`, and `.update()` in `entities.js`, or handle via a callable Cloud Function.")}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

/* ----------------------- Main Page ----------------------- */

export default function UserDetails() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("id");

  const [userHeader, setUserHeader] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [agentData, setAgentData] = useState(null);
  const [tutorData, setTutorData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        if (!userId) {
          setError(tOr(t, "userDetails.noUserId", "No user ID provided in the URL."));
          setLoading(false);
          return;
        }

        const [schoolRes, agentRes, tutorRes] = await Promise.all([
          School.filter({ user_id: userId }),
          Agent.filter({ user_id: userId }),
          Tutor.filter({ user_id: userId }),
        ]);

        if (schoolRes.length > 0) {
          const s = schoolRes[0];
          setSchoolData(s);
          setUserHeader({
            full_name: s.name || tOr(t, "userDetails.school", "School"),
            email: s.email || "",
            user_type: "school",
            created_date: s.created_date || new Date().toISOString(),
            profile_picture: s.image_url || "",
          });
          setSessions([]);
        } else if (agentRes.length > 0) {
          const a = agentRes[0];
          setAgentData(a);
          setUserHeader({
            full_name: a.company_name || tOr(t, "userDetails.agent", "Agent"),
            email: a.email || "",
            user_type: "agent",
            created_date: a.created_date || new Date().toISOString(),
            profile_picture: a.logo_url || "",
          });
          setSessions([]);
        } else if (tutorRes.length > 0) {
          const tu = tutorRes[0];
          setTutorData(tu);
          setUserHeader({
            full_name: tu.display_name || tOr(t, "tutor", "Tutor"),
            email: tu.email || "",
            user_type: "tutor",
            created_date: tu.created_date || new Date().toISOString(),
            profile_picture: tu.profile_picture || "",
          });

          const sess = await TutoringSession.filter({ tutor_id: userId });
          const sorted = [...sess].sort((a, b) => new Date(b.scheduled_date || 0) - new Date(a.scheduled_date || 0));
          setSessions(sorted);
        } else {
          setUserHeader({
            full_name: `${tOr(t, "student", "Student")} ${String(userId).slice(-4)}`,
            email: "",
            user_type: "student",
            created_date: new Date().toISOString(),
            profile_picture: "",
          });

          const sess = await TutoringSession.filter({ student_id: userId });
          const sorted = [...sess].sort((a, b) => new Date(b.scheduled_date || 0) - new Date(a.scheduled_date || 0));
          setSessions(sorted);
        }
      } catch (e) {
        console.error(e);
        setError(tOr(t, "userDetails.fetchError", "An error occurred while fetching user details. Please try again later."));
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [userId, t]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">{tOr(t, "Error", "Error")}</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  const header =
    userHeader || {
      full_name: tOr(t, "userDetails.user", "User"),
      email: "",
      user_type: "user",
      created_date: new Date().toISOString(),
      profile_picture: "",
    };

  const roleLabel =
    header.user_type === "school"
      ? tOr(t, "onboarding.roles.school", "School")
      : header.user_type === "agent"
      ? tOr(t, "onboarding.roles.agent", "Agent")
      : header.user_type === "tutor"
      ? tOr(t, "onboarding.roles.tutor", "Tutor")
      : header.user_type === "student"
      ? tOr(t, "onboarding.roles.student", "Student")
      : header.user_type;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={header.profile_picture} alt={header.full_name} />
              <AvatarFallback>{header.full_name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{header.full_name}</CardTitle>
              <CardDescription className="flex items-center gap-4 flex-wrap">
                {header.email && <span>{header.email}</span>}
                <Badge className="capitalize">{roleLabel}</Badge>
                <span>
                  {tOr(t, "userDetails.joined", "Joined")} {new Date(header.created_date).toLocaleDateString()}
                </span>
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        {header.user_type === "school" && <SchoolDetails schoolData={schoolData} />}
        {header.user_type === "agent" && <AgentDetails agentData={agentData} />}
        {header.user_type === "tutor" && <TutorDetails tutorData={tutorData} sessions={sessions} />}
        {(header.user_type === "student" || header.user_type === "user") && <StudentDetails sessions={sessions} />}

        {!["school", "agent", "tutor", "student", "user"].includes(header.user_type) && (
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600">
                {tOr(t, "userDetails.noSpecificDisplay", "No specific display available for user type:")}{" "}
                <Badge className="capitalize">{header.user_type}</Badge>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
