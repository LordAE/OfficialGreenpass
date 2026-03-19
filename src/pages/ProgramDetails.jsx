import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { School } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  DollarSign,
  Calendar,
  Info,
  MapPin,
  Clock,
  CheckCircle,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getProvinceLabel } from '../components/utils/CanadianProvinces';
import { getLevelLabel } from '../components/utils/EducationLevels';
import { useTranslation } from 'react-i18next';

/* ---------------- UI helpers ---------------- */
const RequirementSection = ({ title, requirements, icon: Icon }) => {
  if (!requirements || requirements.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-5 h-5 text-green-600" />}
        <h4 className="font-semibold text-lg text-gray-800">{title}</h4>
      </div>
      <ul className="space-y-2">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
            <span className="text-gray-700">{req}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const InfoCard = ({ icon: Icon, title, value, subtitle, className = "" }) => (
  <Card className={`h-full ${className}`}>
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <Icon className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="font-bold text-lg text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

const safeGet = (obj, path, fallback = 'Not specified') => {
  const value = path.split('.').reduce((current, key) => current?.[key], obj);
  return (value ?? '') !== '' ? value : fallback;
};

export default function ProgramDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const tr = useCallback(
    (key, def, vars = undefined) => t(key, { defaultValue: def, ...(vars || {}) }),
    [t]
  );

  const formatTuition = useCallback(
    (fee) =>
      !fee || fee === 0
        ? tr('program_detail.contact_school', 'Contact School')
        : `$${Number(fee).toLocaleString()}`,
    [tr]
  );

  const formatLocation = useCallback(
    (city, province, country) => {
      const parts = [];
      if (city?.trim()) parts.push(city);
      if (province?.trim()) parts.push(getProvinceLabel(province));
      if (country?.trim()) parts.push(country);
      return parts.length
        ? parts.join(', ')
        : tr('program_detail.location_not_specified', 'Location not specified');
    },
    [tr]
  );

  const [program, setProgram] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProgramDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgram(null);

    try {
      const url = new URLSearchParams(window.location.search);

      const programId =
        url.get('programId') || url.get('programid') || url.get('id');

      if (!programId) {
        setError(tr('program_detail.no_program_id', 'No program ID provided in URL.'));
        return;
      }

      let foundProgram = null;

      if (typeof School.get === 'function') {
        try {
          const one = await School.get(programId);
          if (one && (one.id === programId || one.program_id === programId)) {
            foundProgram = one;
          }
        } catch (e) {
          // ignore, fallback below
        }
      }

      if (!foundProgram) {
        const allPrograms = await School.list('', 1000);

        if (!allPrograms || allPrograms.length === 0) {
          setError(tr('program_detail.no_programs_available', 'No programs are currently available.'));
          return;
        }

        foundProgram = allPrograms.find(
          (p) => p.id === programId || p.program_id === programId
        );
      }

      if (foundProgram) {
        const normalized = {
          ...foundProgram,
          id: foundProgram.id || foundProgram.program_id,
          program_title:
            foundProgram.program_title || foundProgram.title || foundProgram.name,
          institution_name:
            foundProgram.institution_name || foundProgram.school_name,
          intake_dates: Array.isArray(foundProgram.intake_dates)
            ? foundProgram.intake_dates
            : foundProgram.intake_dates
              ? [foundProgram.intake_dates]
              : [],
        };

        setProgram(normalized);
        setError(null);
      } else {
        setError(
          tr(
            'program_detail.program_not_found',
            'Program not found. The program may have been removed or the link is invalid.'
          )
        );
      }
    } catch (e) {
      const msg = String(e?.message || e);
      if (
        msg.toLowerCase().includes('insufficient') ||
        msg.toLowerCase().includes('permission')
      ) {
        setError(tr('program_detail.missing_permissions', 'Missing or insufficient permissions.'));
      } else {
        setError(
          tr(
            'program_detail.load_failed',
            'Failed to load program details. Please try again.'
          )
        );
      }
      console.error('Error loading program:', e);
    } finally {
      setLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    loadProgramDetails();
  }, [loadProgramDetails]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!program) {
          setSchoolInfo(null);
          return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const schoolId =
          urlParams.get('schoolId') ||
          urlParams.get('schoolid') ||
          urlParams.get('school') ||
          safeGet(program, 'school_id', '') ||
          safeGet(program, 'schoolId', '') ||
          safeGet(program, 'institution_id', '') ||
          safeGet(program, 'institutionId', '');

        if (!schoolId) {
          setSchoolInfo(null);
          return;
        }

        const snap = await getDoc(doc(db, 'institutions', schoolId));
        if (!cancelled) {
          if (snap.exists()) setSchoolInfo({ id: schoolId, ...snap.data() });
          else setSchoolInfo(null);
        }
      } catch (e) {
        if (!cancelled) setSchoolInfo(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [program]);

  const urlParams = new URLSearchParams(window.location.search);
  const schoolId =
    urlParams.get('schoolId') ||
    urlParams.get('schoolid') ||
    urlParams.get('school') ||
    safeGet(program, 'school_id', '') ||
    safeGet(program, 'schoolId', '') ||
    safeGet(program, 'institution_id', '');

  const schoolDetailsBase = createPageUrl('SchoolDetails');
  const schoolDetailsUrl = schoolId
    ? `${schoolDetailsBase}${schoolDetailsBase.includes('?') ? '&' : '?'}id=${encodeURIComponent(
        schoolId
      )}`
    : schoolDetailsBase;

  const handleBack = useCallback(() => {
    const from = location?.state?.from;

    if (from) {
      navigate(from);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(schoolDetailsUrl);
  }, [location?.state?.from, navigate, schoolDetailsUrl]);

  const backLabel = tr('program_detail.back', 'Back');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {tr('program_detail.loading', 'Loading program details...')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Info className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {tr('program_detail.not_available_title', 'Program Not Available')}
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to={createPageUrl('Programs')}>
            <Button>{tr('program_detail.browse_all_programs', 'Browse All Programs')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">
            {tr('program_detail.data_not_available', 'Program data not available.')}
          </p>
        </div>
      </div>
    );
  }

  const notSpecified = tr('program_detail.not_specified', 'Not specified');

  const programTitle = safeGet(
    program,
    'program_title',
    tr('program_detail.program_title_not_available', 'Program Title Not Available')
  );
  const schoolName = safeGet(
    program,
    'school_name',
    tr('program_detail.school_name_not_available', 'School Name Not Available')
  );
  const institutionName = safeGet(program, 'institution_name', schoolName);
  const programLevel = safeGet(program, 'program_level', '');
  const tuitionFee = program.tuition_fee_cad || program.tuition_fee || 0;
  const applicationFee = program.application_fee || 0;
  const duration = safeGet(
    program,
    'duration_display',
    safeGet(program, 'duration', tr('program_detail.contact_school', 'Contact School'))
  );
  const locationText = formatLocation(
    program.school_city,
    program.school_province,
    program.school_country
  );
  const fieldOfStudy = safeGet(program, 'field_of_study', '');
  const programOverview = safeGet(program, 'program_overview', '');
  const institutionType = safeGet(
    program,
    'institution_type',
    tr('program_detail.default_institution_type', 'University')
  );
  const schoolType = safeGet(
    program,
    'school_type',
    tr('program_detail.default_school_type', 'Public')
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <img
                src={
                  schoolInfo?.logo_url ||
                  schoolInfo?.logoUrl ||
                  program.institution_logo_url ||
                  program.logo_url ||
                  'https://images.unsplash.com/photo-1562774053-701939374585?w=100&h=100&fit=crop'
                }
                alt={`${institutionName} logo`}
                className="w-20 h-20 object-contain bg-white border rounded-lg p-2"
              />
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{programTitle}</h1>
                <p className="text-lg text-green-600 font-semibold">{institutionName}</p>
                <p className="text-gray-600 flex items-center gap-2 mt-2">
                  <MapPin className="w-4 h-4" />
                  {locationText}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoCard
                icon={DollarSign}
                title={tr('program_detail.annual_tuition', 'Annual Tuition')}
                value={formatTuition(tuitionFee)}
                subtitle={tuitionFee > 0 ? tr('program_detail.cad_per_year', 'CAD per year') : ''}
              />
              <InfoCard
                icon={Clock}
                title={tr('program_detail.duration', 'Duration')}
                value={duration}
              />
              <InfoCard
                icon={FileText}
                title={tr('program_detail.application_fee', 'Application Fee')}
                value={
                  applicationFee > 0
                    ? `$${applicationFee}`
                    : tr('program_detail.contact_school', 'Contact School')
                }
                subtitle={applicationFee > 0 ? 'CAD' : ''}
              />
            </div>

            <Card>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview">
                    {tr('program_detail.overview', 'Overview')}
                  </TabsTrigger>
                  <TabsTrigger value="details">
                    {tr('program_detail.details', 'Details')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">
                        {tr('program_detail.program_description', 'Program Description')}
                      </h3>
                      {programOverview && programOverview !== notSpecified ? (
                        <p className="text-gray-700 leading-relaxed">{programOverview}</p>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">
                            {tr(
                              'program_detail.description_not_available',
                              'Detailed program description not available.'
                            )}
                          </p>
                          <p className="text-gray-500 text-sm mt-2">
                            {tr(
                              'program_detail.contact_school_more_info',
                              'Contact the school for more information about this program.'
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {fieldOfStudy && fieldOfStudy !== notSpecified && (
                      <div>
                        <h4 className="font-semibold text-lg mb-2">
                          {tr('program_detail.field_of_study', 'Field of Study')}
                        </h4>
                        <Badge variant="outline" className="text-sm px-3 py-1">
                          {fieldOfStudy}
                        </Badge>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">
                          {tr('program_detail.program_features', 'Program Features')}
                        </h4>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">
                              {safeGet(
                                program,
                                'language_of_instruction',
                                tr('program_detail.default_language', 'English')
                              )}{' '}
                              {tr('program_detail.instruction', 'instruction')}
                            </span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">
                              {schoolType} {tr('program_detail.institution', 'institution')}
                            </span>
                          </li>
                          {program.housing_available && (
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm">
                                {tr('program_detail.housing_available', 'Housing available')}
                              </span>
                            </li>
                          )}
                          {program.is_dli && (
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm">
                                {tr('program_detail.dli_certified', 'DLI certified')}
                              </span>
                            </li>
                          )}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">
                          {tr('program_detail.important_dates', 'Important Dates')}
                        </h4>
                        <div className="space-y-2">
                          {program.application_deadline && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-red-500" />
                              <span className="text-sm">
                                {tr('program_detail.application_deadline', 'Application deadline:')}{' '}
                                {program.application_deadline}
                              </span>
                            </div>
                          )}
                          {(program.intake_dates || []).map((intake) => (
                            <div key={intake} className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-green-500" />
                              <span className="text-sm">
                                {tr('program_detail.intake', 'Intake:')} {intake}
                              </span>
                            </div>
                          ))}
                          {!program.application_deadline &&
                            (!program.intake_dates || program.intake_dates.length === 0) && (
                              <p className="text-gray-500 text-sm italic">
                                {tr(
                                  'program_detail.contact_school_dates',
                                  'Contact school for admission dates and deadlines.'
                                )}
                              </p>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">
                        {tr('program_detail.program_information', 'Program Information')}
                      </h4>
                      <div className="space-y-3">
                        {programLevel && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              {tr('program_detail.level', 'Level:')}
                            </span>
                            <span className="font-medium">{getLevelLabel(programLevel)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {tr('program_detail.duration_label', 'Duration:')}
                          </span>
                          <span className="font-medium">{duration}</span>
                        </div>
                        {program.curriculum && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              {tr('program_detail.curriculum', 'Curriculum:')}
                            </span>
                            <span className="font-medium">{program.curriculum}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">
                        {tr('program_detail.institution_information', 'Institution Information')}
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {tr('program_detail.type', 'Type:')}
                          </span>
                          <span className="font-medium">{institutionType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {tr('program_detail.school_type', 'School Type:')}
                          </span>
                          <span className="font-medium">{schoolType}</span>
                        </div>
                        {program.is_dli && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              {tr('program_detail.dli_number', 'DLI Number:')}
                            </span>
                            <span className="font-medium">
                              {safeGet(
                                program,
                                'dli_number',
                                tr('program_detail.certified', 'Certified')
                              )}
                            </span>
                          </div>
                        )}
                        {program.institution_website && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              {tr('program_detail.website', 'Website:')}
                            </span>
                            <a
                              href={program.institution_website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-green-600 hover:underline"
                            >
                              {tr('program_detail.visit_website', 'Visit Website')}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="p-0">
                <img
                  src={
                    schoolInfo?.image_url ||
                    schoolInfo?.imageUrl ||
                    schoolInfo?.banner_url ||
                    schoolInfo?.bannerUrl ||
                    program.school_image_url ||
                    program.image_url ||
                    program.banner_url ||
                    program.institution_logo_url ||
                    'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=250&fit=crop'
                  }
                  alt={schoolName}
                  className="w-full h-40 object-cover rounded-t-lg"
                />
              </CardHeader>
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-2">{schoolName}</h3>
                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  {locationText}
                </div>
                {program.institution_about && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {program.institution_about}
                  </p>
                )}

                <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      {tr('program_detail.institution_type', 'Institution Type:')}
                    </span>
                    <span className="font-medium">{institutionType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      {tr('program_detail.school_type_label', 'School Type:')}
                    </span>
                    <span className="font-medium">{schoolType}</span>
                  </div>
                  {program.housing_available && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        {tr('program_detail.housing', 'Housing:')}
                      </span>
                      <span className="font-medium text-green-600">
                        {tr('program_detail.available', 'Available')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {program.intake_dates?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    {tr('program_detail.upcoming_intakes', 'Upcoming Intakes')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {program.intake_dates.map((intake) => (
                      <Badge key={intake} variant="outline" className="block w-fit">
                        {intake}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}