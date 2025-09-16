import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, X, Share2, PlusCircle } from 'lucide-react';
import { useCompare, getComparedPrograms } from '@/components/utils/comparison';
import { createPageUrl } from '@/utils';
import { toast } from '@/components/ui/use-toast';
import { getLevelLabel } from '../components/utils/EducationLevels';
import { getProvinceLabel } from '../components/utils/CanadianProvinces';

const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || amount === 0) return 'Contact School';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?w=64&h=64&fit=crop';
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 leading-tight truncate">{program.institution_name || 'School Name'}</p>
            <p className="text-xs text-gray-600 line-clamp-3 mt-1">{program.program_title || 'Program Title'}</p>
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
        <Link to={createPageUrl(`ProgramDetail?id=${program.id}`)} className="block w-full text-center bg-green-600 text-white text-sm font-semibold py-2 hover:bg-green-700 transition-colors">
          View Details
        </Link>
      </div>
    </div>
  );
};

const CompareRow = ({ label, values, programData, formatter = (v, p) => v || 'N/A' }) => (
  <TableRow>
    <TableHead className="font-semibold text-gray-700 w-1/5 bg-gray-50 sticky left-0 z-10 border-r">{label}</TableHead>
    {values.map((value, index) => (
      <TableCell key={index} className="text-sm text-center border-r last:border-r-0">
        {formatter(value, programData[index])}
      </TableCell>
    ))}
  </TableRow>
);

export default function ComparePrograms() {
  const [searchParams] = useSearchParams();
  const { items, remove, clear, shareUrl, isReady } = useCompare();
  const [comparedPrograms, setComparedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load programs when component mounts or items change
  useEffect(() => {
    if (!isReady) return;

    const loadPrograms = async () => {
      setLoading(true);
      
      try {
        // Check URL params first
        const urlIds = searchParams.get('ids');
        let programIds = [];
        
        if (urlIds) {
          programIds = urlIds.split(',');
        } else {
          programIds = items.map(item => item.id);
        }
        
        console.log('Loading programs with IDs:', programIds);
        
        if (programIds.length > 0) {
          const programs = await getComparedPrograms(programIds);
          console.log('Loaded programs for comparison:', programs);
          setComparedPrograms(programs);
        } else {
          setComparedPrograms([]);
        }
      } catch (error) {
        console.error('Error loading compared programs:', error);
        toast({ 
          title: 'Error', 
          description: 'Could not load comparison data.', 
          variant: 'destructive' 
        });
        setComparedPrograms([]);
      } finally {
        setLoading(false);
      }
    };

    loadPrograms();
  }, [items, isReady, searchParams]);

  const handleShare = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: "The comparison link has been copied to your clipboard.",
      });
    }
  };

  // Pad programs array to always show 4 columns
  const paddedPrograms = [...comparedPrograms];
  while (paddedPrograms.length < 4) {
    paddedPrograms.push(null);
  }

  const fields = [
    { 
      label: 'Program Level', 
      key: 'program_level',
      formatter: (v) => v ? getLevelLabel(v) : 'N/A'
    },
    { 
      label: 'Discipline', 
      key: 'field_of_study' 
    },
    { 
      label: 'Tuition/Year', 
      key: 'tuition_fee_cad', 
      formatter: formatCurrency 
    },
    { 
      label: 'Duration', 
      key: 'duration_display' 
    },
    { 
      label: 'Delivery', 
      key: 'delivery_mode' 
    },
    { 
      label: 'Language', 
      key: 'language_of_instruction' 
    },
    { 
      label: 'Location', 
      key: 'school_city', 
      formatter: (v, p) => {
        if (!p || !p.school_city) return 'N/A';
        const province = p.school_province ? getProvinceLabel(p.school_province) : '';
        return province ? `${p.school_city}, ${province}` : p.school_city;
      }
    },
    { 
      label: 'Next Intake', 
      key: 'intake_dates', 
      formatter: (v) => Array.isArray(v) && v.length > 0 ? v[0] : 'N/A' 
    },
    { 
      label: 'Application Fee', 
      key: 'application_fee', 
      formatter: formatCurrency 
    },
    { 
      label: 'Scholarships', 
      key: 'scholarships_available', 
      formatter: v => v === true ? 'Yes' : v === false ? 'No' : 'N/A' 
    }
  ];

  if (loading || !isReady) {
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
                <p className="text-gray-600 mb-6">
                  Add up to 4 programs to see a side-by-side comparison.
                </p>
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
                      <p className="text-sm text-gray-600">{comparedPrograms.length} program{comparedPrograms.length !== 1 ? 's' : ''} selected</p>
                    </div>
                  </TableHead>
                  {paddedPrograms.map((p, index) => (
                    <TableHead key={p?.id || index} className="w-1/4 p-0 align-top border-r last:border-r-0">
                      <ProgramColumn program={p} onRemove={remove} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map(field => (
                  <CompareRow
                    key={field.label}
                    label={field.label}
                    values={paddedPrograms.map(p => p ? p[field.key] : null)}
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