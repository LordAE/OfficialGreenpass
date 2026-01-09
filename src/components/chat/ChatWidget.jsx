// src/components/chat/ChatWidget.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export default function ChatWidget() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        className="rounded-full shadow-lg gap-2"
        onClick={() => navigate("/messages?to=support&role=support")}
      >
        <MessageSquare className="w-4 h-4" />
        Support
      </Button>
    </div>
  );
}
