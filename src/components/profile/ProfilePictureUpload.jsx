// src/components/profile/ProfilePictureUpload.jsx
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

/* ---- Firebase ---- */
import { auth, storage, db } from "@/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function ProfilePictureUpload({
  currentPicture,
  onUpdate,
  autoSaveToFirestore = true, // leave true to write users/{uid}.photo_url automatically
  fallbackName = "User",
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Invalid image type. Please use JPG, PNG, or WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size cannot exceed 2MB.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in to upload your profile picture.");
      return;
    }

    try {
      setIsUploading(true);
      setProgress(0);

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `users/${user.uid}/profile/profile_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);

      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        cacheControl: "public,max-age=31536000,immutable",
      });

      // ❗Wrap in a Promise so we can await true completion (or error)
      await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setProgress(pct);
          },
          (err) => {
            reject(err);
          },
          () => {
            resolve();
          }
        );
      });

      const file_url = await getDownloadURL(task.snapshot.ref);

      // Update Firestore user doc (optional)
      if (autoSaveToFirestore) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          photo_url: file_url,
          updatedAt: serverTimestamp(),
        }).catch(() => {
          // ignore if doc missing; parent page likely ensures user doc exists
        });
      }

      // Notify parent to reflect immediately in UI
      onUpdate && onUpdate(file_url);
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      alert(err?.message || "Failed to upload profile picture. Please try again.");
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClick = () => fileInputRef.current?.click();

  return (
    <div className="flex items-center gap-4">
      <img
        src={currentPicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName || "User")}`}
        alt="Profile"
        className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
      />
      <div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
          disabled={isUploading}
        />
        <Button variant="outline" size="sm" onClick={handleClick} disabled={isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading{progress ? ` ${progress}%` : "..."}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Change Photo
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP up to 2MB</p>
      </div>
    </div>
  );
}
