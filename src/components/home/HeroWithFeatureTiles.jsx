import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Megaphone, GraduationCap, MapPin, Compass, ChevronRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import "./hero-with-feature-tiles.css";

/**
 * Bates-style hero: background video + 4 angled feature tiles.
 * All styles are namespaced under gp-hero-* to avoid collisions.
 */
export default function HeroWithFeatureTiles({
  videoSrc = "/assets/hero.mp4https://firebasestorage.googleapis.com/v0/b/greenpass-dc92d.firebasestorage.app/o/home%2FGPintro.mp4?alt=media&token=bbcde9d6-a628-429f-9cff-8cad12933cba", // 
  poster = "",
  title = "",
  subtitle = "",
  tiles = [
    {
      icon: <Compass size={28} />,
      title: "Future Students",
      desc: "Explore programs, admissions, and support designed for international students.",
      href: createPageUrl("programs"),
      tone: "teal",
      leftCut: "0px",
      rightCut: "28px",
    },
    {
      icon: <GraduationCap size={28} />,
      title: "Academic Programs",
      desc: "Browse degrees, compare tuition and duration, and see intake dates and requirements.",
      href: createPageUrl("compare-programs"),
      tone: "amber",
      leftCut: "28px",
      rightCut: "28px",
    },
    {
      icon: <Megaphone size={28} />,
      title: "Calendars & Events",
      desc: "Stay on top of fairs, deadlines, class schedules, workshops, and interviews.",
      href: createPageUrl("events"),
      tone: "sky",
      leftCut: "28px",
      rightCut: "28px",
    },
    {
      icon: <MapPin size={28} />,
      title: "Virtual Campus Tours",
      desc: "Take guided tours, learn about housing and banking, and connect with mentors.",
      href: createPageUrl("tours"),
      tone: "rose",
      leftCut: "28px",
      rightCut: "0px",
    },
  ],
}) {
  return (
    <section className="gp-hero-root">
      {/* Video band */}
      <div className="gp-hero-videoWrap">
        <video
          className="gp-hero-video"
          src={videoSrc}
          poster={poster}
          playsInline
          muted
          loop
          autoPlay
        />
        <div className="gp-hero-overlay" />

        <div className="gp-hero-center">
          <h1 className="gp-hero-title">{title}</h1>
          <p className="gp-hero-sub">{subtitle}</p>
        </div>
      </div>

      {/* Feature tiles row */}
      <div className="gp-hero-tiles">
        {tiles.map((t, i) => (
          <article
            key={i}
            className={`gp-hero-tile gp-hero-${t.tone}`}
            style={{
              ["--gp-leftCut"]: t.leftCut,
              ["--gp-rightCut"]: t.rightCut,
            }}
          >
            <div className="gp-hero-tileInner">
              <div className="gp-hero-icon">{t.icon}</div>
              <h3 className="gp-hero-tileTitle">{t.title}</h3>
              <p className="gp-hero-desc">{t.desc}</p>

              <Button asChild className="gp-hero-btn">
                <Link to={t.href}>
                  Learn More <ChevronRight size={18} />
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
