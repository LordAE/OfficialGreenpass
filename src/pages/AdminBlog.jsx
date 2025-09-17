// src/pages/AdminBlog.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PlusCircle, Edit, Trash2, BookOpen, Loader2 } from "lucide-react";
import PostForm from "../components/admin/blog/PostForm";

/* ---------- Firebase ---------- */
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

/* ========= Helpers ========= */
function toMillisMaybe(v) {
  // Support Firestore Timestamp, number, ISO string, or undefined
  if (!v) return 0;
  // Firestore Timestamp
  if (typeof v === "object" && typeof v.toMillis === "function") return v.toMillis();
  // number
  if (typeof v === "number" && Number.isFinite(v)) return v;
  // ISO/string
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}

function displayDate(post) {
  // Prefer created_at, then created_date, then updated_at
  const ms =
    toMillisMaybe(post.created_at) ||
    toMillisMaybe(post.created_date) ||
    toMillisMaybe(post.updated_at);
  if (!ms) return "—";
  try {
    return format(new Date(ms), "MMM dd, yyyy");
  } catch {
    return "—";
  }
}

/* ========= Component ========= */
export default function AdminBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "posts"));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort(
        (a, b) =>
          (toMillisMaybe(b.created_at) || toMillisMaybe(b.created_date)) -
          (toMillisMaybe(a.created_at) || toMillisMaybe(a.created_date))
      );
      setPosts(items);
    } catch (error) {
      console.error("Error loading posts:", error);
      if (error?.code === "permission-denied") {
        alert("You don't have permission to read blog posts.");
      } else {
        alert("Failed to load posts.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleSave = async (postData) => {
    try {
      if (selectedPost?.id) {
        const ref = doc(db, "posts", selectedPost.id);
        await updateDoc(ref, {
          ...postData,
          // Keep legacy created_date if it already existed; otherwise prefer created_at
          updated_at: serverTimestamp(),
        });
      } else {
        const refCol = collection(db, "posts");
        await addDoc(refCol, {
          ...postData,
          created_at: serverTimestamp(),
          created_date: new Date().toISOString(), // legacy-friendly
          updated_at: serverTimestamp(),
        });
      }
      setIsFormOpen(false);
      setSelectedPost(null);
      loadPosts();
    } catch (error) {
      console.error("Error saving post:", error);
      if (error?.code === "permission-denied") {
        alert("You don't have permission to save blog posts.");
      } else {
        alert("Failed to save post. Check console for details.");
      }
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      loadPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      if (error?.code === "permission-denied") {
        alert("You don't have permission to delete blog posts.");
      } else {
        alert("Failed to delete post.");
      }
    }
  };

  const openForm = (post = null) => {
    setSelectedPost(post);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <BookOpen className="w-8 h-8 text-indigo-700" />
            <h1 className="text-3xl font-bold text-gray-800">Blog Management</h1>
          </div>

          <Dialog
            open={isFormOpen}
            onOpenChange={(isOpen) => {
              if (!isOpen) setSelectedPost(null);
              setIsFormOpen(isOpen);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => openForm()}>
                <PlusCircle className="w-4 h-4 mr-2" /> Create New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{selectedPost ? "Edit Post" : "Create New Post"}</DialogTitle>
              </DialogHeader>
              <PostForm
                post={selectedPost}
                onSave={handleSave}
                onCancel={() => {
                  setIsFormOpen(false);
                  setSelectedPost(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Posts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : posts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">{post.title || "Untitled"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{post.category || "—"}</Badge>
                      </TableCell>
                      <TableCell>{post.author || "—"}</TableCell>
                      <TableCell>{displayDate(post)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openForm(post)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(post.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts found</h3>
                <p className="text-gray-600">Click "Create New Post" to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
