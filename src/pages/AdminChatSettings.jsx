// src/pages/AdminChatSettings.jsx
import React from "react";
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, MessageCircleMore } from "lucide-react";

// Use the same collection name your rules allow.
// If your rules are `match /chat_settings/{docId}`, keep this:
const COLL = "chat_settings";
// If you prefer camelCase, change to "chatSettings" AND add a rule
// `match /chatSettings/{docId} { allow read: if true; allow create, update, delete: if isAdmin(); }`
const ID = "SINGLETON";

export default function AdminChatSettings() {
  const [saving, setSaving] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(null);

  const [settings, setSettings] = React.useState({
    whatsapp_number: "",
    zalo_number: "",
    whatsapp_default_message: "",
  });

  React.useEffect(() => {
    (async () => {
      try {
        setError(null);
        const ref = doc(db, COLL, ID);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data() || {};
          setSettings({
            whatsapp_number: data.whatsapp_number || "",
            zalo_number: data.zalo_number || "",
            whatsapp_default_message: data.whatsapp_default_message || "",
          });
        } else {
          const defaults = {
            singleton_key: "SINGLETON",
            whatsapp_number: "",
            zalo_number: "",
            whatsapp_default_message: "",
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          };
          await setDoc(ref, defaults);
          setSettings({
            whatsapp_number: "",
            zalo_number: "",
            whatsapp_default_message: "",
          });
        }
      } catch (e) {
        console.error("Error loading chat settings:", e);
        setError(
          e?.code === "permission-denied"
            ? "You don’t have permission to view or edit chat settings."
            : "Failed to load chat settings."
        );
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const onChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const ref = doc(db, COLL, ID);
      await updateDoc(ref, {
        whatsapp_number: settings.whatsapp_number || "",
        zalo_number: settings.zalo_number || "",
        whatsapp_default_message: settings.whatsapp_default_message || "",
        updated_at: serverTimestamp(),
      });
      // Optional: small toast/alert
      alert("Chat settings saved.");
    } catch (e) {
      console.error("Error saving chat settings:", e);
      setError(
        e?.code === "permission-denied"
          ? "You don’t have permission to save these settings."
          : "Failed to save chat settings."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <Card className="p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Loading chat settings…
            </span>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Chat Settings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Configure the WhatsApp and Zalo numbers used by the{" "}
              <span className="font-medium">Chat</span> button across the
              GreenPass app and website.
            </p>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-3 text-sm text-red-700">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Main form */}
        <form onSubmit={onSave}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircleMore className="w-5 h-5" />
                WhatsApp &amp; Zalo
              </CardTitle>
              <CardDescription>
                These numbers power the one-click contact links shown to
                students. You can paste them in any format – we’ll sanitize
                them to digits when generating links.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_number">WhatsApp number</Label>
                  <Input
                    id="whatsapp_number"
                    placeholder="+1 437 xxx xxxx or 1437…"
                    value={settings.whatsapp_number}
                    onChange={(e) =>
                      onChange("whatsapp_number", e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Any format is fine. We’ll strip non-digits when building
                    the WhatsApp link.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zalo_number">Zalo number</Label>
                  <Input
                    id="zalo_number"
                    placeholder="+84 9xx xxx xxx or 849xx…"
                    value={settings.zalo_number}
                    onChange={(e) =>
                      onChange("zalo_number", e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for the <code>zalo.me</code> link in markets where
                    Zalo is popular.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_default_message">
                  Default WhatsApp message (optional)
                </Label>
                <Input
                  id="whatsapp_default_message"
                  placeholder="Hi GreenPass! I need help with…"
                  value={settings.whatsapp_default_message}
                  onChange={(e) =>
                    onChange("whatsapp_default_message", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  This text is appended as <code>?text=…</code> to the
                  WhatsApp URL when students click the chat button.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Changes apply immediately wherever the Chat button is shown.
              </p>
              <Button type="submit" disabled={saving}>
                {saving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
