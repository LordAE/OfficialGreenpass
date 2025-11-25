// src/pages/AdminInstitutions.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  limit,
  startAfter,
  getCountFromServer,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  Edit,
  Trash2,
  Building,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
} from "lucide-react";
import InstitutionForm from "../components/institutions/InstitutionForm";

const COLL = "institutions";

export default function AdminInstitutions() {
  const [institutions, setInstitutions] = useState([]); // current page data
  const [filteredInstitutions, setFilteredInstitutions] = useState([]); // search + filters on current page
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [dliFilter, setDliFilter] = useState("all"); // all | dli | non_dli

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize, setPageSize] = useState(25);

  const [totalCount, setTotalCount] = useState(null);

  // Firestore cursors per page (stored in ref to avoid re-renders)
  const pageCursorsRef = useRef([]); // index 0 = page 1 lastDoc, etc.

  const totalPages =
    totalCount != null ? Math.ceil(totalCount / pageSize) : null;

  /* ---------------------- LOAD PAGE (FIRESTORE PAGINATION) ---------------------- */
  const loadPage = useCallback(
    async (pageNumber = 1) => {
      setLoading(true);
      try {
        let q = query(
          collection(db, COLL),
          orderBy("name", "asc"),
          limit(pageSize)
        );

        if (pageNumber > 1) {
          const pageCursors = pageCursorsRef.current;
          const prevCursor = pageCursors[pageNumber - 2]; // page 1 cursor is index 0
          if (!prevCursor) {
            setLoading(false);
            return;
          }
          q = query(
            collection(db, COLL),
            orderBy("name", "asc"),
            startAfter(prevCursor),
            limit(pageSize)
          );
        }

        const snap = await getDocs(q);

        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const safeData = Array.isArray(data)
          ? data.filter((item) => item && typeof item === "object")
          : [];

        setInstitutions(safeData);

        // Save cursor for this page (in ref)
        if (snap.docs.length > 0) {
          const lastDoc = snap.docs[snap.docs.length - 1];
          const pageCursors = pageCursorsRef.current.slice();
          pageCursors[pageNumber - 1] = lastDoc;
          pageCursorsRef.current = pageCursors;
        }

        setHasMore(snap.docs.length === pageSize);
        setCurrentPage(pageNumber);
      } catch (error) {
        console.error("Error loading institutions:", error);
        setInstitutions([]);
        alert("Failed to load institutions (Firestore).");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  // Initial load + reload when pageSize changes
  useEffect(() => {
    pageCursorsRef.current = [];
    setCurrentPage(1);
    loadPage(1);
  }, [loadPage]);

  /* --------------------- LOAD TOTAL COUNT (FOR MAX PAGE) ----------------------- */
  useEffect(() => {
    let cancelled = false;

    const loadCount = async () => {
      try {
        const collRef = collection(db, COLL);
        const snapshot = await getCountFromServer(collRef);
        if (!cancelled) {
          setTotalCount(snapshot.data().count || 0);
        }
      } catch (err) {
        console.error("Error getting institutions count:", err);
      }
    };

    loadCount();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ----------------------------- SEARCH + FILTERS ------------------------------- */
  useEffect(() => {
    if (!Array.isArray(institutions)) {
      setFilteredInstitutions([]);
      return;
    }

    let list = [...institutions];

    // Search (current page)
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      list = list.filter((institution) => {
        if (!institution) return false;
        const name = (institution.name || "").toLowerCase();
        const city = (institution.city || "").toLowerCase();
        const province = (institution.province || "").toLowerCase();
        const country = (institution.country || "").toLowerCase();
        return (
          name.includes(term) ||
          city.includes(term) ||
          province.includes(term) ||
          country.includes(term)
        );
      });
    }

    // Country filter – case-insensitive
    if (countryFilter !== "all") {
      const cf = countryFilter.toString().trim().toLowerCase();
      list = list.filter((institution) => {
        const v = (institution.country || "")
          .toString()
          .trim()
          .toLowerCase();
        return v === cf;
      });
    }

    // DLI filter
    if (dliFilter === "dli") {
      list = list.filter((institution) => institution.isDLI === true);
    } else if (dliFilter === "non_dli") {
      list = list.filter((institution) => institution.isDLI !== true);
    }

    setFilteredInstitutions(list);
  }, [institutions, searchTerm, countryFilter, dliFilter]);

  /* -------------------------- COUNTRY OPTIONS (WITH EXTRA) --------------------- */
  const uniqueCountriesFromData = Array.from(
    new Set(
      institutions
        .map((i) => (i.country || "").toString().trim())
        .filter((v) => v.length > 0)
    )
  );

  // Always include these, even if not present on the current page
  const EXTRA_COUNTRIES = ["Germany", "Ireland", "New Zealand"];

  const uniqueCountries = Array.from(
    new Set([...uniqueCountriesFromData, ...EXTRA_COUNTRIES])
  ).sort((a, b) => a.localeCompare(b));

  /* ------------------------------ CRUD HANDLERS -------------------------------- */
  const handleSave = async (institutionData) => {
    try {
      if (selectedInstitution?.id) {
        const ref = doc(db, COLL, selectedInstitution.id);
        await updateDoc(ref, {
          ...institutionData,
          updated_at: serverTimestamp(),
        });
      } else {
        const ref = collection(db, COLL);
        await addDoc(ref, {
          ...institutionData,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }
      setIsFormOpen(false);
      setSelectedInstitution(null);
      await loadPage(currentPage);
    } catch (error) {
      console.error("Error saving institution:", error);
      alert("Failed to save institution. Please try again.");
    }
  };

  const handleDelete = async (institutionId) => {
    if (!institutionId) return;
    if (window.confirm("Are you sure you want to delete this institution?")) {
      try {
        const ref = doc(db, COLL, institutionId);
        await deleteDoc(ref);
        await loadPage(currentPage);
      } catch (error) {
        console.error("Error deleting institution:", error);
        alert("Failed to delete institution. Please try again.");
      }
    }
  };

  const openForm = (institution = null) => {
    setSelectedInstitution(institution);
    setIsFormOpen(true);
  };

  /* ----------------------------- PAGINATION UI --------------------------------- */
  const handleNext = () => {
    if (!hasMore || loading) return;
    loadPage(currentPage + 1);
  };

  const handlePrev = () => {
    if (currentPage === 1 || loading) return;
    loadPage(currentPage - 1);
  };

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = startIndex + filteredInstitutions.length - 1;

  /* --------------------------------- RENDER ------------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header + Add Institution */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              Institution Management
            </h1>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openForm()}>
                <PlusCircle className="w-4 h-4 mr-2" /> Add Institution
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedInstitution
                    ? "Edit Institution"
                    : "Add New Institution"}
                </DialogTitle>
              </DialogHeader>
              <InstitutionForm
                institution={selectedInstitution}
                onSave={handleSave}
                onCancel={() => {
                  setIsFormOpen(false);
                  setSelectedInstitution(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + Filters + Page size */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search institutions by name, city, province, or country (current page)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters + Page size */}
              <div className="flex flex-wrap gap-3 items-center justify-start md:justify-end">
                {/* Country Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Country</span>
                  <Select
                    value={countryFilter}
                    onValueChange={setCountryFilter}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {uniqueCountries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* DLI Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">DLI Status</span>
                  <Select value={dliFilter} onValueChange={setDliFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="dli">DLI only</SelectItem>
                      <SelectItem value="non_dli">Non-DLI only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Page size */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    Rows per page
                  </span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v))}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table + Pagination */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Institutions (Page {currentPage}
              {totalPages != null ? ` of ${totalPages}` : ""},{" "}
              {filteredInstitutions.length} shown)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : !filteredInstitutions ||
              filteredInstitutions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No institutions found. Add your first institution to get
                started.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Institution</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Programs</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInstitutions.map((institution) => (
                      <TableRow key={institution.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {institution.logoUrl && (
                              <img
                                src={institution.logoUrl}
                                alt={institution.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium">
                                {institution.name}
                              </div>
                              {institution.website && (
                                <div className="text-sm text-gray-500">
                                  {institution.website}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>
                              {institution.city}, {institution.province}
                            </div>
                            <div className="text-gray-500">
                              {institution.country}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {institution.isFeatured && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                Featured
                              </Badge>
                            )}
                            {institution.isDLI ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                DLI
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <XCircle className="w-3 h-3 mr-1" />
                                Non-DLI
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {institution.programCount || 0} programs
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openForm(institution)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(institution.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination footer */}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handlePrev}
                      disabled={currentPage === 1 || loading}
                    >
                      Previous
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleNext}
                      disabled={!hasMore || loading}
                    >
                      Next
                    </Button>

                    <span className="text-sm text-gray-600 ml-2">
                      Page {currentPage}
                      {totalPages != null ? ` of ${totalPages}` : ""}
                    </span>
                  </div>

                  <span className="text-xs text-gray-500">
                    {totalCount != null
                      ? `Showing ${startIndex}–${endIndex} of ${totalCount}`
                      : `Showing ${startIndex}–${endIndex}`}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
