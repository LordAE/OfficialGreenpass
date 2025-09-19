import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { School } from '@/api/entities';
import ProgramFilters from '../components/programs/ProgramFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, GraduationCap, MapPin, DollarSign, Search, ArrowRight, Plus, Check } from 'lucide-react';
import { getLevelLabel } from '../components/utils/EducationLevels';
import { getProvinceLabel } from '../components/utils/CanadianProvinces';
import { useCompare } from '@/components/utils/comparison';
import { toast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ProgramCard = ({ program, onCompareClick, isCompared, isCompareFull }) => {
  const handleCompareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCompared) {
      onCompareClick(program, 'remove');
      toast({
        title: "Removed from Comparison",
        description: `${program.program_title} has been removed from your comparison list.`,
      });
    } else {
      const result = onCompareClick(program, 'add');
      if (result?.error) {
        toast({
          title: "Cannot Add to Comparison",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Added to Comparison",
          description: `${program.program_title} has been added to your comparison list.`,
        });
      }
    }
  };

  return (
    <Card className="h-full flex flex-col group overflow-hidden border hover:border-green-500 hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4 flex flex-col flex-grow">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-white">
            <img
              src={program.institution_logo_url || 'https://images.unsplash.com/photo-1562774053-701939374585?w=64&h=64&fit=crop'}
              alt={`${program.institution_name || 'School'} logo`}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1562774053-701939374585?w=64&h=64&fit=crop';
              }}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-700">{program.institution_name || 'Institution'}</p>
            <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-green-600">
              {program.program_title || 'Program Title'}
            </h3>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{program.school_city || 'City'}, {getProvinceLabel(program.school_province) || 'Province'}</span>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-gray-500" />
            <span>{getLevelLabel(program.program_level) || 'Program Level'}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span>${(program.tuition_fee_cad || 0).toLocaleString()} CAD / year</span>
          </div>
        </div>

        <div className="mt-auto pt-4 flex items-center space-x-2">
          <Link to={createPageUrl(`ProgramDetail?id=${program.id}`)} className="flex-1">
            <Button className="w-full bg-green-600 hover:bg-green-700">
              View Details <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isCompared ? "default" : "outline"}
                  size="icon"
                  onClick={handleCompareClick}
                  disabled={!isCompared && isCompareFull}
                  className={cn(
                    "transition-all duration-200",
                    isCompared ? "bg-blue-600 text-white hover:bg-blue-700" : "hover:bg-gray-100"
                  )}
                >
                  {isCompared ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCompared ? "Remove from Compare" : (isCompareFull ? "Compare list is full (max 4)" : "Add to Compare")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};

function ProgramsPageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [allProgramsData, setAllProgramsData] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { add, remove, contains, isFull, isReady } = useCompare();

  const activeTab = useMemo(() => searchParams.get('view') || 'browse', [searchParams]);

  // Pagination constants/state derived from URL
  const PAGE_SIZE = 15;
  const rawPage = useMemo(() => parseInt(searchParams.get('page') || '1', 10), [searchParams]);
  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const filters = useMemo(() => {
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'view' && key !== 'page') {
        params[key] = value;
      }
    }
    return params;
  }, [searchParams]);

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const programsData = await School.list('-created_date', 1000);
      if (!programsData || programsData.length === 0) {
        setError('No programs found. Please use the Master Data Seeder to populate program data.');
        setAllProgramsData([]);
        return;
      }
      setAllProgramsData(programsData);
    } catch (error) {
      console.error("Error loading programs:", error);
      setError('Failed to load programs. Please try again or use the Master Data Seeder.');
      setAllProgramsData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  // Apply filters
  useEffect(() => {
    let results = allProgramsData;
    if (Object.keys(filters).length > 0) {
      results = allProgramsData.filter(p => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value || value === 'all') return true;

          switch (key) {
            case 'search': {
              const searchLower = value.toLowerCase();
              return (p.program_title || '').toLowerCase().includes(searchLower) ||
                     (p.institution_name || '').toLowerCase().includes(searchLower) ||
                     (p.school_name || '').toLowerCase().includes(searchLower);
            }
            case 'country': return p.school_country === value;
            case 'province': return p.school_province === value;
            case 'city': return p.school_city === value;
            case 'level': return p.program_level === value;
            case 'discipline': return p.field_of_study === value;
            case 'tuitionMax': return (p.tuition_fee_cad || 0) <= Number(value);
            case 'scholarships': return value === 'true' ? p.scholarships_available === true : true;
            default: return true;
          }
        });
      });
    }
    setPrograms(results);
  }, [allProgramsData, filters]);

  // Ensure page stays within bounds when results change
  const totalPages = Math.max(1, Math.ceil(programs.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) {
      const currentParams = new URLSearchParams(searchParams);
      currentParams.set('page', String(totalPages));
      setSearchParams(currentParams, { replace: true });
    }
  }, [page, totalPages, searchParams, setSearchParams]);

  // Slice for current page
  const startIndex = (Math.min(page, totalPages) - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, programs.length);
  const paginatedPrograms = useMemo(
    () => programs.slice(startIndex, endIndex),
    [programs, startIndex, endIndex]
  );

  const handleFilterChange = (newFilters) => {
    const currentParams = new URLSearchParams(searchParams);

    if (!currentParams.has('view')) {
      currentParams.set('view', 'browse');
    }

    // Apply incoming filters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        currentParams.set(key, value);
      } else {
        currentParams.delete(key);
      }
    });

    // Reset to first page whenever filters change
    currentParams.set('page', '1');

    setSearchParams(currentParams);
  };

  const handleCompareClick = useCallback((program, action) => {
    if (action === 'remove') {
      remove(program.id);
      return { success: true };
    } else {
      return add(program);
    }
  }, [add, remove]);

  const onTabChange = (value) => {
    if (value === 'compare') {
      navigate(createPageUrl('ComparePrograms'));
    } else {
      const currentParams = new URLSearchParams(searchParams);
      currentParams.set('view', 'browse');
      // keep filters, reset to page 1
      currentParams.set('page', '1');
      setSearchParams(currentParams);
    }
  };

  const goToPage = (nextPage) => {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages);
    const currentParams = new URLSearchParams(searchParams);
    currentParams.set('page', String(clamped));
    // preserve current filters & view
    setSearchParams(currentParams);
  };

  if (loading || !isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading programs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <p className="text-sm">{error}</p>
          </div>
          <Link to={createPageUrl('Dashboard')}>
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8">
        <Tabs value={activeTab} onValueChange={onTabChange} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="browse">Find Schools & Programs</TabsTrigger>
            <TabsTrigger value="compare">Compare Programs</TabsTrigger>
          </TabsList>
        </Tabs>

        <ProgramFilters
          programs={allProgramsData}
          onFilterChange={handleFilterChange}
          initialFilters={filters}
        />

        <div className="mb-4 text-sm text-gray-600">
          {programs.length > 0
            ? <>Showing <span className="font-medium">{startIndex + 1}</span>–<span className="font-medium">{endIndex}</span> of <span className="font-medium">{programs.length}</span> programs</>
            : <>Showing 0 of 0 programs</>
          }
        </div>

        {programs.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Programs Found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search criteria or populate data using the Master Data Seeder.</p>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {paginatedPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onCompareClick={handleCompareClick}
                  isCompared={contains(program.id)}
                  isCompareFull={isFull()}
                />
              ))}
            </div>

            {/* Pagination controls */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Page <span className="font-medium">{Math.min(page, totalPages)}</span> of <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(1)}
                  disabled={page <= 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(totalPages)}
                  disabled={page >= totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProgramsPage() {
  return <ProgramsPageContent />;
}
