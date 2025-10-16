import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin } from "lucide-react";

/** Helper to pick localized fields with EN fallback */
const pickI18n = (obj, lang, key) =>
  obj?.[`${key}_${lang}`] ?? obj?.[`${key}_en`] ?? obj?.[key] ?? "";

export default function PromotionCard({ promo, lang = "vi" }) {
  const title = pickI18n(promo, lang, "title");
  const subtitle = pickI18n(promo, lang, "subtitle");
  const priceLabel = pickI18n(promo, lang, "price_label");
  const regFee = pickI18n(promo, lang, "registration_fee_label");
  const location = pickI18n(promo, lang, "location");
  const ctaLabel = pickI18n(promo, lang, "cta_label") || (lang === "vi" ? "Tìm hiểu thêm" : "Learn more");
  const tags = promo?.[`tags_${lang}`] ?? promo?.tags_en ?? [];

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}>
      <Card className="overflow-hidden rounded-2xl shadow-sm border">
        <div className="relative">
          <img
            src={promo.image_url}
            alt={title}
            className="h-56 w-full object-cover"
            loading="lazy"
          />
          {priceLabel && (
            <div className="absolute left-3 top-3">
              <Badge className="text-base px-3 py-1 rounded-xl">{priceLabel}</Badge>
            </div>
          )}
          {regFee && (
            <div className="absolute right-3 top-3">
              <Badge variant="secondary" className="text-sm px-3 py-1 rounded-xl">
                {regFee}
              </Badge>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h3 className="text-lg font-bold leading-tight drop-shadow">{title}</h3>
            {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {location && (
            <div className="flex items-center text-sm text-muted-foreground gap-2">
              <MapPin size={16} /> <span>{location}</span>
            </div>
          )}

          {Array.isArray(tags) && tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 5).map((t, i) => (
                <Badge key={i} variant="outline" className="rounded-xl">{t}</Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={16} />
              <span>Ongoing</span>
            </div>

            {promo.cta_link && (
              <Button asChild className="rounded-xl">
                <a href={promo.cta_link}>{ctaLabel}</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
