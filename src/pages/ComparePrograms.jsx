// src/pages/ComparePrograms.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, X, Share2, PlusCircle } from 'lucide-react';
import { useCompare } from '@/components/utils/comparison';
import { createPageUrl } from '@/utils';
import { toast } from '@/components/ui/use-toast';
import { getLevelLabel } from '../components/utils/EducationLevels';
import { getProvinceLabel } from '../components/utils/CanadianProvinces';

// Firestore
import { db } from '@/firebase';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';

// ✅ your data is in this collection
const PROGRAMS_COLLECTION = 'schools';

// Support both the compare hook cache and localStorage (in case user opens a new tab)
const LOCAL_KEYS = ['gp_compare_programs_v1', 'gp_compare', 'compare_items', 'gpa:compare'];

const REQUIRED_FIELDS = [
  'program_level',
  'field_of_study',
  'tuition_fee_cad',
  'duration_display',
  'delivery_mode',
  'language_of_instruction',
  'school_city',
  'school_province',
  'intake_dates',
  'application_fee',
  'scholarships_available',
];

const formatCurrency = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 'Contact School';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n);
};

const ProgramColumn = ({ program, onRemove }) => {
  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 border rounded-lg bg-gray-50 text-center min-h-[200px]">
        <PlusCircle className="w-10 h-10 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500 mb-2">Add a program to compare</p>
        <Link to={createPageUrl('Programs')}>
          <Button size="sm" variant="outline">Browse Programs</Button>
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full min-h-[200px]">
      <div className="relative p-4 rounded-t-lg bg-white border-b">
        <div className="flex items-start space-x-3">
          <img
            src={program.institution_logo_url || 'https://images.unsplash.com/photo-1562774053-701939374585?w=64&h=64&fit=crop'}
            alt={`${program.institution_name || 'School'} logo`}
            className="h-12 w-12 object-contain bg-gray-100 border p-1 rounded-md flex-shrink-0"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1562774053-701939374585?w=64&h=64&fit=crop'; }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 leading-tight truncate">
              {program.institution_name || 'School Name'}
            </p>
            <p className="text-xs text-gray-600 line-clamp-3 mt-1">
              {program.program_title || 'Program Title'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 rounded-full"
          onClick={() => onRemove(program.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex-1 flex items-end">
        <Link
          to={createPageUrl(`ProgramDetail?id=${program.id}`)}
          className="block w-full text-center bg-green-600 text-white text-sm font-semibold py-2 hover:bg-green-700 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

const CompareRow = ({ label, values, programData, formatter = (v, p) => v || 'N/A' }) => (
  <TableRow>
    <TableHead className="font-semibold text-gray-700 w-1/5 bg-gray-50 sticky left-0 z-10 border-r">
      {label}
    </TableHead>
    {values.map((value, index) => (
      <TableCell key={index} className="text-sm text-center border-r last:border-r-0">
        {formatter(value, programData[index])}
      </TableCell>
    ))}
  </TableRow>
);

// Normalize shapes from list/hook/Firestore
const normalizeProgram = (p) => {
  if (!p) return null;
  return {
    id: p.id || p.docId || p.program_id || p.uid,
    program_title: p.program_title ?? p.title ?? '',
    institution_name: p.institution_name ?? p.school_name ?? '',
    institution_logo_url: p.institution_logo_url ?? p.logo_url ?? '',
    school_city: p.school_city ?? p.city ?? '',
    school_province: p.school_province ?? p.province ?? '',
    program_level: p.program_level ?? p.level ?? '',
    field_of_study: p.field_of_study ?? p.discipline ?? '',
    tuition_fee_cad: p.tuition_fee_cad ?? p.tuition ?? p.tuition_cad ?? 0,
    duration_display: p.duration_display ?? p.duration ?? '',
    delivery_mode: p.delivery_mode ?? '',
    language_of_instruction: p.language_of_instruction ?? p.language ?? '',
    intake_dates: p.intake_dates ?? p.intakes ?? [],
    application_fee: p.application_fee ?? 0,
    scholarships_available: p.scholarships_available ?? p.scholarships ?? null,
  };
};

const hasMissingCoreFields = (p) =>
  REQUIRED_FIELDS.some((k) => p[k] === undefined || p[k] === null || (k === 'tuition_fee_cad' && !(Number(p[k]) > 0)));

export default function ComparePrograms() {
  const [searchParams] = useSearchParams();
  const { items, remove, clear, shareUrl, isReady } = useCompare();

  const [comparedPrograms, setComparedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const getStorePrograms = () => {
    if (!isReady || !Array.isArray(items) || items.length === 0) return [];
    return items.map(normalizeProgram).filter((x) => x?.id);
  };

  const getLocalProgramsOrIds = () => {
    for (const key of LOCAL_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) continue;

        const rich = arr.some((x) => x && typeof x === 'object' && Object.keys(x).length > 1);
        if (rich) return { programs: arr.map(normalizeProgram).filter(Boolean) };

        const ids = arr.map((x) => (typeof x === 'string' ? x : x?.id)).filter(Boolean);
        if (ids.length) return { ids };
      } catch {}
    }
    return {};
  };

  const fetchProgramsByIds = async (ids) => {
    if (!ids?.length) return [];
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

    const docs = [];
    for (const c of chunks) {
      const qRef = query(collection(db, PROGRAMS_COLLECTION), where(documentId(), 'in', c));
      const snap = await getDocs(qRef);
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));
    }
    return docs.map(normalizeProgram).filter(Boolean);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Priority: hook → URL (?ids=) → localStorage
        let programs = getStorePrograms();

        if (!programs.length) {
          const urlIds = searchParams.get('ids');
          if (urlIds) {
            const ids = urlIds.split(',').map((s) => s.trim()).filter(Boolean);
            programs = await fetchProgramsByIds(ids);
          }
        }
        if (!programs.length) {
          const { programs: localPrograms, ids } = getLocalProgramsOrIds();
          if (localPrograms?.length) programs = localPrograms;
          else if (ids?.length) programs = await fetchProgramsByIds(ids);
        }

        // Hydrate any half-filled objects with full docs from Firestore
        const toHydrate = programs.filter(hasMissingCoreFields).map((p) => p.id);
        if (toHydrate.length) {
          const fetched = await fetchProgramsByIds([...new Set(toHydrate)]);
          const map = Object.fromEntries(fetched.map((p) => [p.id, p]));
          programs = programs.map((p) => (map[p.id] ? { ...p, ...map[p.id] } : p));
        }

        setComparedPrograms(programs || []);
      } catch (err) {
        console.error('Compare load error:', err);
        setComparedPrograms([]);
        toast({ title: 'Error', description: 'Could not load comparison data.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isReady, items, searchParams]);

  // Build a share link locally if hook doesn’t supply one
  const computedShareUrl = useMemo(() => {
    const ids = comparedPrograms.map((p) => p.id);
    const base = createPageUrl('ComparePrograms');
    return ids.length ? `${base}?ids=${encodeURIComponent(ids.join(','))}` : base;
  }, [comparedPrograms]);

  const handleShare = () => {
    const url = shareUrl || computedShareUrl;
    navigator.clipboard.writeText(url).then(
      () => toast({ title: 'Link Copied!', description: 'The comparison link has been copied to your clipboard.' }),
      () => toast({ title: 'Copy failed', description: url, variant: 'destructive' })
    );
  };

  // Fallback: if getLevelLabel doesn't know the value, show the raw string from Firestore
  const levelFormatter = (v) => {
    if (!v) return 'N/A';
    const label = getLevelLabel(v);
    return label || (typeof v === 'string' ? v : 'N/A');
    // e.g. Firestore might store "2-Year Undergraduate Diploma"
  };

  const paddedPrograms = useMemo(() => {
    const arr = [...comparedPrograms];
    while (arr.length < 4) arr.push(null);
    return arr;
  }, [comparedPrograms]);

  const fields = [
    { label: 'Program Level', key: 'program_level', formatter: levelFormatter },
    { label: 'Discipline', key: 'field_of_study' },
    { label: 'Tuition/Year', key: 'tuition_fee_cad', formatter: formatCurrency },
    { label: 'Duration', key: 'duration_display' },
    { label: 'Delivery', key: 'delivery_mode' },
    { label: 'Language', key: 'language_of_instruction' },
    {
      label: 'Location',
      key: 'school_city',
      formatter: (v, p) => {
        if (!p || !p.school_city) return 'N/A';
        const province = p.school_province ? getProvinceLabel(p.school_province) : '';
        return province ? `${p.school_city}, ${province}` : p.school_city;
      },
    },
    {
      label: 'Next Intake',
      key: 'intake_dates',
      formatter: (v) => {
        if (Array.isArray(v)) return v.length ? v[0] : 'N/A';
        if (typeof v === 'string') return v || 'N/A';
        return 'N/A';
      },
    },
    { label: 'Application Fee', key: 'application_fee', formatter: formatCurrency },
    { label: 'Scholarships', key: 'scholarships_available', formatter: (v) => (v === true ? 'Yes' : v === false ? 'No' : 'N/A') },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-green-600" />
      </div>
    );
  }

  const hasPrograms = comparedPrograms.length > 0;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Compare Programs</h1>
              <p className="text-sm text-gray-500">View schools and programs side-by-side.</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleShare} disabled={!hasPrograms}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="destructive" onClick={clear} disabled={!hasPrograms}>
                <X className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasPrograms ? (
          <div className="text-center py-20">
            <Card className="max-w-lg mx-auto p-8">
              <CardHeader>
                <CardTitle>Your Comparison List is Empty</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-6">Add up to 4 programs to see a side-by-side comparison.</p>
                <Link to={createPageUrl('Programs')}>
                  <Button size="lg">
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Browse Programs
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="border-collapse border bg-white rounded-lg overflow-hidden shadow-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/5 bg-gray-50 sticky left-0 z-10 border-r">
                    <div className="py-2">
                      <p className="text-sm text-gray-600">
                        {comparedPrograms.length} program{comparedPrograms.length !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                  </TableHead>
                  {paddedPrograms.map((p, index) => (
                    <TableHead key={p?.id || `empty-${index}`} className="w-1/4 p-0 align-top border-r last:border-r-0">
                      <ProgramColumn program={p} onRemove={remove} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <CompareRow
                    key={field.label}
                    label={field.label}
                    values={paddedPrograms.map((p) => (p ? p[field.key] : null))}
                    programData={paddedPrograms}
                    formatter={field.formatter}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
