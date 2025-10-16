import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import PromotionCard from "./PromotionCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function PromotionsSection({ lang = "vi", header = true, max = 12, viewAllLink = "/promotions" }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Preferred query; may require a composite index
        const q = query(
          collection(db, "promotions"),
          where("is_active", "==", true),
          orderBy("priority", "desc"),
          limit(max)
        );
        const snap = await getDocs(q);
        setPromos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        // Fallback if index is missing: fetch all and sort locally
        try {
          const snap = await getDocs(collection(db, "promotions"));
          setPromos(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((p) => p.is_active)
              .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
              .slice(0, max)
          );
        } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, [max]);

  const activePromos = useMemo(() => promos, [promos]);

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto w-full max-w-7xl px-4">
        {header && (
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {lang === "vi" ? "Ưu đãi & Chương trình nổi bật" : "Featured Promotions"}
              </h2>
              <p className="text-muted-foreground">
                {lang === "vi"
                  ? "Khám phá các chương trình đặc biệt đang mở đăng ký."
                  : "Explore programs currently open for registration."}
              </p>
            </div>

            {viewAllLink && (
              <Button variant="outline" asChild className="rounded-xl">
                <a href={viewAllLink}>{lang === "vi" ? "Xem tất cả" : "View all"}</a>
              </Button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" /> {lang === "vi" ? "Đang tải..." : "Loading..."}
          </div>
        ) : activePromos.length === 0 ? (
          <div className="text-muted-foreground">
            {lang === "vi" ? "Chưa có ưu đãi nào." : "No promotions yet."}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activePromos.map((p) => (
              <PromotionCard key={p.id} promo={p} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
