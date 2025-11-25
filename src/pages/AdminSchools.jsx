// src/pages/AdminSchools.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Search,
  Loader2,
  School as SchoolIcon,
} from "lucide-react";

import SchoolForm from "../components/admin/SchoolForm";

const COLL = "schools"; // Firestore collection

export default function AdminSchools() {
  const [schools, setSchools] = useState([]); // current page data
  const [filteredSchools, setFilteredSchools] = useState([]); // search on current page
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize, setPageSize] = useState(25); // rows per page

  const [totalCount, setTotalCount] = useState(null); // total docs in collection

  // Store Firestore cursors without triggering re-renders
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
          orderBy("created_at", "desc"),
          limit(pageSize)
        );

        // If not the first page, start after the last doc of previous page
        if (pageNumber > 1) {
          const pageCursors = pageCursorsRef.current;
          const prevCursor = pageCursors[pageNumber - 2]; // page 1 cursor is index 0
          if (!prevCursor) {
            setLoading(false);
            return;
          }
          q = query(
            collection(db, COLL),
            orderBy("created_at", "desc"),
            startAfter(prevCursor),
            limit(pageSize)
          );
        }

        const snap = await getDocs(q);

        const data = snap.docs.map((d) => {
          const obj = { id: d.id, ...d.data() };
          const ts =
            obj.created_at && typeof obj.created_at.toMillis === "function"
              ? obj.created_at.toMillis()
              : 0;
          return { ...obj, __createdAtMs: ts };
        });

        const safe = Array.isArray(data)
          ? data.filter((x) => x && typeof x === "object")
          : [];

        setSchools(safe);

        // Save cursor for this page (in ref, no re-render)
        if (snap.docs.length > 0) {
          const lastDoc = snap.docs[snap.docs.length - 1];
          const pageCursors = pageCursorsRef.current.slice();
          pageCursors[pageNumber - 1] = lastDoc;
          pageCursorsRef.current = pageCursors;
        }

        setHasMore(snap.docs.length === pageSize);
        setCurrentPage(pageNumber);
      } catch (error) {
        console.error("Error loading school programs:", error);
        setSchools([]);
        alert("Failed to load school programs.");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  // Initial load + reload when pageSize changes
  useEffect(() => {
    pageCursorsRef.current = []; // reset cursors when pageSize changes
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
        console.error("Error getting schools count:", err);
      }
    };

    loadCount();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------- SEARCH (ONLY) -------------------------------- */
  useEffect(() => {
    let list = [...schools];

    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      list = list.filter((s) => {
        const a = (s?.school_name || "").toLowerCase();
        const b = (s?.program_title || "").toLowerCase();
        const c = (s?.institution_name || "").toLowerCase();
        const d = (s?.school_city || "").toLowerCase();
        return (
          a.includes(t) ||
          b.includes(t) ||
          c.includes(t) ||
          d.includes(t)
        );
      });
    }

    setFilteredSchools(list);
  }, [schools, searchTerm]);

  /* ------------------------------ CRUD HANDLERS -------------------------------- */
  const handleSave = async (formData) => {
    try {
      if (selectedSchool?.id) {
        await updateDoc(doc(db, COLL, selectedSchool.id), {
          ...formData,
          updated_at: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, COLL), {
          ...formData,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }
      setIsFormOpen(false);
      setSelectedSchool(null);
      await loadPage(currentPage);
    } catch (error) {
      console.error("Error saving school program:", error);
      alert("Failed to save school program. Please try again.");
    }
  };

  const handleDelete = async (schoolId) => {
    if (!schoolId) return;
    if (
      window.confirm(
        "Are you sure you want to delete this school program? This action cannot be undone."
      )
    ) {
      try {
        await deleteDoc(doc(db, COLL, schoolId));
        await loadPage(currentPage);
      } catch (error) {
        console.error("Error deleting school program:", error);
        alert("Failed to delete school program. Please try again.");
      }
    }
  };

  const openForm = (school = null) => {
    setSelectedSchool(school);
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
  const endIndex = startIndex + filteredSchools.length - 1;

  /* --------------------------------- RENDER ------------------------------------ */
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header + Add Program */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <SchoolIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              School Program Management
            </h1>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openForm()}>
                <PlusCircle className="w-4 h-4 mr-2" /> Add Program
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedSchool
                    ? "Edit School Program"
                    : "Add New School Program"}
                </DialogTitle>
              </DialogHeader>
              <SchoolForm
                school={selectedSchool}
                onSave={handleSave}
                onCancel={() => {
                  setIsFormOpen(false);
                  setSelectedSchool(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + Page size */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by school, program, institution, or city (current page)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Page size */}
              <div className="flex items-center gap-2 md:justify-end">
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
          </CardContent>
        </Card>

        {/* Table + Pagination */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SchoolIcon className="w-5 h-5" />
              School Programs (Page {currentPage}
              {totalPages != null ? ` of ${totalPages}` : ""},{" "}
              {filteredSchools.length} shown)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : !filteredSchools || filteredSchools.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No school programs found on this page.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program Title</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell className="font-medium">
                          {school.program_title}
                        </TableCell>
                        <TableCell>{school.school_name}</TableCell>
                        <TableCell>
                          {school.institution_name || "N/A"}
                        </TableCell>
                        <TableCell>
                          {school.school_city}
                          {school.school_province
                            ? `, ${school.school_province}`
                            : ""}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {(school.program_level || "").toString()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {school.school_country || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openForm(school)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(school.id)}
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
