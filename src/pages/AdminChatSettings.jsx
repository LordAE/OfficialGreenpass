// src/pages/AdminChatSettings.jsx
import React from "react";
import { db } from "@/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLL = "chatSettings";       // <- collection your app uses
const ID   = "SINGLETON";          // <- single settings doc id

export default function AdminChatSettings() {
  const [saving, setSaving] = React.useState(false);
  const [settings, setSettings] = React.useState({
    whatsapp_number: "",
    zalo_number: "",
    whatsapp_default_message: "",
  });
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const ref = doc(db, COLL, ID);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
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
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const onChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const ref = doc(db, COLL, ID);
      await updateDoc(ref, {
        whatsapp_number: settings.whatsapp_number || "",
        zalo_number: settings.zalo_number || "",
        whatsapp_default_message: settings.whatsapp_default_message || "",
        updated_at: serverTimestamp(),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-9 bg-gray-100 rounded" />
          <div className="h-9 bg-gray-100 rounded" />
          <div className="h-9 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Chat Settings</h1>
      <form onSubmit={onSave} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="whatsapp_number">WhatsApp number</Label>
          <Input
            id="whatsapp_number"
            placeholder="+63 9xx xxx xxxx or 639xx..."
            value={settings.whatsapp_number}
            onChange={(e) => onChange("whatsapp_number", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Store in any format; we’ll sanitize to digits for the link.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zalo_number">Zalo number</Label>
          <Input
            id="zalo_number"
            placeholder="+84 9xx xxx xxx or 849xx..."
            value={settings.zalo_number}
            onChange={(e) => onChange("zalo_number", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Stored flexibly; sanitized to digits for <code>zalo.me</code>.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp_default_message">Default WhatsApp message (optional)</Label>
          <Input
            id="whatsapp_default_message"
            placeholder="Hi GreenPass! I need help with…"
            value={settings.whatsapp_default_message}
            onChange={(e) => onChange("whatsapp_default_message", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Appends as <code>?text=...</code> in the WhatsApp link.
          </p>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
