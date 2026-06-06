import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-xl text-gray-900 tracking-tight">
            Revise <span className="text-purple-600">Wallah</span>
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-6 text-center relative">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-purple-100 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 animate-fade-up">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
            Built for Indian students — JEE · NEET · GATE · UPSC
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 animate-fade-up delay-100">
            <span className="bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-600 bg-clip-text text-transparent animate-gradient">
              AI Revision System
            </span>
            <br />
            <span className="text-gray-900">for Video Learning</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up delay-200">
            Paste any YouTube lecture URL. Get structured notes, flashcards, and a quiz —
            in under 30 seconds. Works with Physics Wallah, Unacademy, MIT OCW, and more.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-300">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-4 rounded-full text-base transition-all shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              Generate your first study kit
              <span className="text-lg">→</span>
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 text-gray-700 hover:text-purple-600 font-medium px-8 py-4 rounded-full border border-gray-200 hover:border-purple-200 text-base transition-all"
            >
              See how it works
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-sm text-gray-400 animate-fade-up delay-400">
            Free to start · No credit card required
          </p>
        </div>
      </section>

      {/* ── PREVIEW CARD ────────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-purple-50 border border-gray-200 rounded-3xl p-8 shadow-xl shadow-purple-100/40 animate-float">
            {/* URL bar mock */}
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6 shadow-sm">
              <span className="text-red-500 text-lg">▶</span>
              <span className="text-gray-400 text-sm flex-1">
                https://youtube.com/watch?v=newton-laws-physics-wallah
              </span>
              <span className="bg-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg">
                Generate
              </span>
            </div>

            {/* Output preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="text-2xl mb-2">📝</div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">Structured Notes</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Section-by-section breakdown with key formulas, definitions, and exam tips
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-sm ring-1 ring-purple-200">
                <div className="text-2xl mb-2">🃏</div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">Flashcards</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  25+ spaced-repetition cards covering every concept from the lecture
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="text-2xl mb-2">🧠</div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">Practice Quiz</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  15+ MCQs with explanations, mapped to JEE · NEET · GATE difficulty
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              From lecture to study kit in 3 steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "🔗",
                title: "Paste the URL",
                desc: "Copy any YouTube lecture link — Hindi, English, or Hinglish. Physics Wallah, Unacademy, MIT, anything.",
              },
              {
                step: "02",
                icon: "⚡",
                title: "AI processes it",
                desc: "Our pipeline transcribes the audio, then Gemini AI extracts concepts, notes, flashcards and quiz questions.",
              },
              {
                step: "03",
                icon: "✅",
                title: "Study smarter",
                desc: "Open your study kit — read notes, flip flashcards, test yourself with the quiz. Everything in one place.",
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="relative bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute -top-4 left-8 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {step}
                </div>
                <div className="text-3xl mb-4 mt-2">{icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR WHOM ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">
              Who it's for
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Used by students across
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              {
                icon: "⚗️",
                title: "Engineering & Medical",
                tags: ["JEE Main", "JEE Advanced", "NEET UG", "GATE"],
                desc: "Crack competitive exams with concept-mapped notes and PYQ-tagged flashcards",
              },
              {
                icon: "🏛️",
                title: "Civil Services",
                tags: ["UPSC CSE", "State PSC", "GS Paper I-IV"],
                desc: "Convert long UPSC lectures into revision-ready notes and answer-writing practice",
              },
              {
                icon: "🎓",
                title: "College Students",
                tags: ["B.Tech", "MBBS", "B.Sc", "University exams"],
                desc: "Stop rewatching 3-hour lectures before exams — get the notes in seconds",
              },
              {
                icon: "📚",
                title: "Self Learners",
                tags: ["MIT OCW", "Khan Academy", "Coursera"],
                desc: "Learn from the world's best lectures with structured notes in your language",
              },
            ].map(({ icon, title, tags, desc }) => (
              <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-purple-200 hover:shadow-md transition-all">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag) => (
                    <span key={tag} className="text-xs font-medium bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Everything you need to revise
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: "🗣️", title: "Hindi & Hinglish support", desc: "Understands code-switched lectures from Indian educators — no quality loss" },
              { icon: "🔢", title: "Formula extraction", desc: "LaTeX-formatted equations pulled directly from the lecture — Physics, Maths, Chemistry" },
              { icon: "🗺️", title: "Concept mind map", desc: "Visual map of how concepts connect — see the big picture before diving in" },
              { icon: "📅", title: "Revision schedule", desc: "Ebbinghaus-based schedule tells you exactly when to revise for maximum retention" },
              { icon: "⚠️", title: "Common mistakes", desc: "AI flags the exact errors students make on this topic — avoid them from day one" },
              { icon: "⚡", title: "Smart caching", desc: "Popular lectures are cached — get results instantly, not in 30 seconds" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-purple-200 hover:shadow-sm transition-all">
                <div className="text-2xl mb-3">{icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">
              Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Simple, minute-based pricing
            </h2>
            <p className="text-gray-500 mt-3 text-base">
              Pay for what you watch. No monthly lock-in.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-8">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Free</p>
              <div className="text-4xl font-extrabold text-gray-900 mb-1">₹0</div>
              <p className="text-sm text-gray-500 mb-6">To get started</p>
              <ul className="space-y-3 mb-8">
                {["30 free minutes", "All content formats", "Flashcards & quiz", "Concept mind map"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className="text-green-500 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block text-center bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                Start free
              </Link>
            </div>

            <div className="bg-purple-600 border-2 border-purple-600 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full">
                Popular
              </div>
              <p className="text-xs font-semibold text-purple-200 uppercase tracking-wider mb-4">Minute Booster</p>
              <div className="text-4xl font-extrabold text-white mb-1">₹49</div>
              <p className="text-sm text-purple-200 mb-6">per 100 minutes</p>
              <ul className="space-y-3 mb-8">
                {["100 lecture minutes", "Priority processing", "No expiry", "All free features"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white">
                    <span className="text-purple-200 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block text-center bg-white hover:bg-purple-50 text-purple-700 font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                Get minutes
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-br from-purple-600 to-indigo-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Stop rewatching. Start revising.
          </h2>
          <p className="text-purple-200 text-lg mb-10">
            Join students turning YouTube lectures into study kits in seconds.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-10 py-4 rounded-full text-base hover:bg-purple-50 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            Generate your first study kit free →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 bg-gray-900 text-center">
        <p className="text-gray-500 text-sm">
          © 2026 Revise Wallah · Built for Indian students ·{" "}
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 transition-colors">
            Dashboard
          </Link>
        </p>
      </footer>
    </div>
  );
}
