/* =========================
   Stats (white, MSM-style, with count-up)
========================= */
const Stats = ({ stats }) => {
  // Falls back to your three stats if none provided from CMS
  const items = Array.isArray(stats) && stats.length
    ? stats
    : [
        { value: "96%",     label: "Visa Success Rate" },
        { value: "15,000+", label: "Happy Students" },
        { value: "1,200+",  label: "Partner Institutions" },
      ];

  // choose an icon per label
  const iconFor = (label = "") => {
    const s = label.toLowerCase();
    if (s.includes("visa") || s.includes("%")) return TrendingUp;
    if (s.includes("student")) return Users;
    if (s.includes("program") || s.includes("course")) return GraduationCap;
    if (s.includes("partner") || s.includes("institution") || s.includes("campus")) return SchoolIcon;
    return Users;
  };

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div
          className={`
            grid gap-8 lg:gap-12
            grid-cols-2 sm:grid-cols-3
            ${items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}
          `}
        >
          {items.map((it, i) => {
            const Icon = iconFor(it.label);
            return (
              <StatCard
                key={i}
                Icon={Icon}
                valueString={it.value}
                label={it.label}
                delay={i * 0.05}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ---- Card with animated number
function StatCard({ Icon, valueString, label, delay = 0 }) {
  const [start, setStart] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      onViewportEnter={() => setStart(true)}
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center">
          <Icon className="h-6 w-6 text-green-700" />
        </div>
        <div>
          <div className="text-2xl font-extrabold text-slate-900 leading-none">
            <CountUp valueString={valueString} start={start} duration={1.4} />
          </div>
          <div className="mt-1 text-slate-600 text-sm">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ---- CountUp: animates 0 -> target, keeps %/+/commas
function CountUp({ value
