// src/components/chat/ChatWidget.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

const STORAGE_KEY = "gp_support_widget_pos_v1";
const PADDING = 8; // keep away from edges

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Movable/Draggable Support button.
 * - Drag to reposition (position persists in localStorage)
 * - Click to open support chat
 */
export default function ChatWidget() {
  const navigate = useNavigate();
  const wrapRef = React.useRef(null);

  const [pos, setPos] = React.useState(() => {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY) || "");
    if (saved && typeof saved.x === "number" && typeof saved.y === "number") return saved;
    return null; // use bottom-right default until dragged
  });

  const dragRef = React.useRef({
    active: false,
    moved: false,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const getSize = React.useCallback(() => {
    const node = wrapRef.current;
    const w = node?.offsetWidth || 180;
    const h = node?.offsetHeight || 48;
    return { w, h };
  }, []);

  const clampToViewport = React.useCallback(
    (next) => {
      const { w, h } = getSize();
      const maxX = Math.max(PADDING, window.innerWidth - w - PADDING);
      const maxY = Math.max(PADDING, window.innerHeight - h - PADDING);
      return {
        x: clamp(next.x, PADDING, maxX),
        y: clamp(next.y, PADDING, maxY),
      };
    },
    [getSize]
  );

  const snapToSide = React.useCallback(
    (next) => {
      const { w, h } = getSize();
      const maxX = Math.max(PADDING, window.innerWidth - w - PADDING);
      const maxY = Math.max(PADDING, window.innerHeight - h - PADDING);

      const y = clamp(next.y, PADDING, maxY);
      // Snap to the nearest side edge.
      const centerX = next.x + w / 2;
      const x = centerX < window.innerWidth / 2 ? PADDING : maxX;
      return { x, y };
    },
    [getSize]
  );

  // Keep the widget inside the viewport on resize
  React.useEffect(() => {
    if (!pos) return;
    const onResize = () => setPos((p) => (p ? snapToSide(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos, snapToSide]);

  const onPointerDown = React.useCallback(
    (e) => {
      // left click / primary touch only
      if (e.button != null && e.button !== 0) return;

      const node = wrapRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();

      // If we haven't switched to absolute positioning yet, initialize from current DOM location.
      const initialPos = pos ?? { x: rect.left, y: rect.top };
      const start = clampToViewport(initialPos);

      // Save as absolute so movement is consistent
      if (!pos) setPos(start);

      dragRef.current.active = true;
      dragRef.current.moved = false;
      dragRef.current.pointerId = e.pointerId;
      dragRef.current.startClientX = e.clientX;
      dragRef.current.startClientY = e.clientY;
      dragRef.current.offsetX = e.clientX - start.x;
      dragRef.current.offsetY = e.clientY - start.y;

      try {
        node.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    [pos, clampToViewport]
  );

  const onPointerMove = React.useCallback(
    (e) => {
      const st = dragRef.current;
      if (!st.active) return;

      const dx = e.clientX - st.startClientX;
      const dy = e.clientY - st.startClientY;

      // Don't treat tiny jitter as a drag
      if (!st.moved && Math.hypot(dx, dy) < 4) return;

      st.moved = true;

      const next = clampToViewport({
        x: e.clientX - st.offsetX,
        y: e.clientY - st.offsetY,
      });

      setPos(next);
    },
    [clampToViewport]
  );

  const onPointerUp = React.useCallback(() => {
    const st = dragRef.current;
    if (!st.active) return;

    st.active = false;

    // Snap to a side edge on release, then persist.
    if (pos) {
      const snapped = snapToSide(pos);
      setPos(snapped);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapped));
      } catch {
        // ignore
      }
    }

    // Let the click handler know a drag happened (if any)
    // and reset it on next tick after click-capture phase.
    if (st.moved) {
      setTimeout(() => {
        st.moved = false;
      }, 0);
    }
  }, [pos, snapToSide]);

  const onClickCapture = React.useCallback((e) => {
    // If user dragged, block the click navigation.
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <div
      ref={wrapRef}
      className={[
        "fixed z-50 select-none touch-none",
        pos ? "" : "bottom-6 right-6",
      ].join(" ")}
      style={pos ? { left: `${pos.x}px`, top: `${pos.y}px` } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      title="Drag to move"
    >
      <Button
        className="rounded-full shadow-lg gap-2"
        onClickCapture={onClickCapture}
        onClick={() => navigate("/messages?to=support&role=support")}
      >
        <MessageSquare className="w-4 h-4" />
        Support
      </Button>
    </div>
  );
}
