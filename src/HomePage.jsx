import { useState } from "react";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div className="home">
      <Hero />
      <QuickSearch />
      <FeatureGrid />
      <Steps />
      <Deadlines />
      <Highlights />
      <Resources />
      <FAQ />
      <FloatingHelp />
      <FooterCTA />
    </div>
  );
}

// ---------- Sections ----------

function Hero() {
  return (
    <section className="hero container">
      <div className="hero__content">
        <p className="pill">AI-powered • Student-friendly • Free</p>
        <h1>
          Find the right university.
          <br />
          Apply with confidence.
        </h1>
        <p className="subtitle">
          Your companion for programs, requirements, deadlines, and a step-by-step
          application plan — all in one clean interface.
        </p>
        <a href="#search" className="btn btn--primary">Start searching</a>
        <a href="#steps" className="btn btn--ghost">How it works</a>
      </div>
      <div className="hero__card glass">
        <h3>Today’s checklist</h3>
        <ul className="checklist">
          <li>Pick 3 target programs</li>
          <li>Download transcripts</li>
          <li>Draft motivation letter outline</li>
        </ul>
        <small className="muted">Tip: Turn items into tasks in the Tracker.</small>
      </div>
    </section>
  );
}

function QuickSearch() {
  const [form, setForm] = useState({
    q: "Computer Science",
    location: "South Africa",
    level: "Undergraduate",
    budget: "≤ R8,000 / year",
  });

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    // Hand this object to your teammate’s backend or navigate to /search
    alert(
      `Search:\nProgram: ${form.q}\nLocation: ${form.location}\nLevel: ${form.level}\nBudget: ${form.budget}`
    );
  };

  return (
    <section id="search" className="search container glass">
      <h2>Search programs</h2>
      <form onSubmit={onSubmit} className="grid">
        <div className="field">
          <label>Program / Major</label>
          <input
            name="q"
            value={form.q}
            onChange={onChange}
            placeholder="e.g., Computer Science, BCom Finance"
          />
        </div>
        <div className="field">
          <label>Country or City</label>
          <input
            name="location"
            value={form.location}
            onChange={onChange}
            placeholder="e.g., South Africa, UK, Toronto"
          />
        </div>
        <div className="field">
          <label>Level</label>
          <select name="level" value={form.level} onChange={onChange}>
            <option>Undergraduate</option>
            <option>Postgraduate</option>
            <option>Diploma / Certificate</option>
            <option>PhD</option>
          </select>
        </div>
        <div className="field">
          <label>Budget</label>
          <select name="budget" value={form.budget} onChange={onChange}>
            <option>≤ R8,000 / year</option>
            <option>≤ R15,000 / year</option>
            <option>≤ R25,000 / year</option>
            <option>No limit</option>
          </select>
        </div>

        <div className="actions">
          <button className="btn btn--primary" type="submit">Search</button>
          <button className="btn btn--ghost" type="button"
            onClick={() => alert("Filters coming soon: duration, online/campus, IELTS/TOEFL, scholarships")}>
            More filters
          </button>
        </div>
      </form>
      <p className="muted">You can refine results later and compare programs side-by-side.</p>
    </section>
  );
}

function FeatureGrid() {
  const items = [
    { title: "Smart Search", desc: "Find programs by keyword, level, budget, and location.", icon: "🔎" },
    { title: "Requirements", desc: "Clear entry requirements and required documents.", icon: "🧾" },
    { title: "Deadlines", desc: "Track upcoming application dates and reminders.", icon: "🗓️" },
    { title: "Compare", desc: "Compare programs in one clean view.", icon: "⚖️" },
    { title: "AI Help", desc: "Chat to ask anything and get guidance.", icon: "🤖" },
    { title: "Tracker", desc: "Turn steps into tasks and tick them off.", icon: "✅" },
  ];
  return (
    <section className="features container">
      {items.map((it) => (
        <div key={it.title} className="feature glass">
          <div className="feature__icon">{it.icon}</div>
          <h3>{it.title}</h3>
          <p>{it.desc}</p>
        </div>
      ))}
    </section>
  );
}

function Steps() {
  const steps = [
    { n: 1, title: "Discover", desc: "Search by program & location, shortlist 3–5 options." },
    { n: 2, title: "Check Fit", desc: "Verify entry requirements, fees, and documents." },
    { n: 3, title: "Plan", desc: "Note deadlines and create a personal timeline." },
    { n: 4, title: "Apply", desc: "Submit applications and track progress to offers." },
  ];
  return (
    <section id="steps" className="steps container glass">
      <h2>How it works</h2>
      <div className="steps__grid">
        {steps.map((s) => (
          <div key={s.n} className="step">
            <div className="step__badge">{s.n}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Deadlines() {
  const upcoming = [
    { uni: "University of the Witwatersrand", program: "BSc Computer Science", date: "2025-10-31" },
    { uni: "University of Cape Town", program: "BSc Computer Science", date: "2025-10-15" },
    { uni: "Stellenbosch University", program: "MSc AI & ML", date: "2025-11-30" },
  ];
  return (
    <section className="deadlines container">
      <div className="deadlines__header">
        <h2>Upcoming deadlines</h2>
        <button className="btn btn--ghost" onClick={() => alert("Connect calendar coming soon")}>
          Sync to Calendar
        </button>
      </div>
      <div className="timeline glass">
        {upcoming.map((d, i) => (
          <div className="timeline__item" key={i}>
            <div className="dot" />
            <div className="content">
              <h4>{d.uni}</h4>
              <p className="muted">{d.program}</p>
              <p className="badge">{d.date}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Highlights() {
  const cards = [
    { uni: "Wits University", city: "Johannesburg, SA", fee: "R4,500/yr", tag: "Strong research" },
    { uni: "University of Cape Town", city: "Cape Town, SA", fee: "R5,200/yr", tag: "Top ranked" },
    { uni: "Stellenbosch University", city: "Stellenbosch, SA", fee: "R6,800/yr", tag: "ML focus" },
  ];
  return (
    <section className="highlights container">
      <h2>Featured programs</h2>
      <div className="cardgrid">
        {cards.map((c) => (
          <div key={c.uni} className="card glass">
            <div className="card__thumb" />
            <div className="card__content">
              <h3>{c.uni}</h3>
              <p className="muted">{c.city}</p>
              <div className="row">
                <span className="badge">{c.fee}</span>
                <span className="badge badge--soft">{c.tag}</span>
              </div>
              <button className="btn btn--primary" onClick={() => alert("Go to program details page")}>
                View details
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Resources() {
  return (
    <section className="resources container glass">
      <h2>Starter resources</h2>
      <div className="res__grid">
        <div>
          <h4>Documents checklist</h4>
          <ul className="list">
            <li>ID / Passport</li>
            <li>Academic transcripts</li>
            <li>Proof of English (IELTS/TOEFL if needed)</li>
            <li>Motivation / Personal statement</li>
            <li>Reference letters (if required)</li>
          </ul>
        </div>
        <div>
          <h4>Money & fees</h4>
          <ul className="list">
            <li>Application fee per program</li>
            <li>Annual tuition estimate</li>
            <li>Scholarships & bursaries</li>
            <li>Accommodation & living costs</li>
          </ul>
        </div>
        <div>
          <h4>Tips for first-timers</h4>
          <ul className="list">
            <li>Shortlist by requirements first</li>
            <li>Work backwards from deadlines</li>
            <li>Keep a single documents folder</li>
            <li>Ask AI when stuck — it’s free</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const qs = [
    { q: "Is this free to use?", a: "Yes. Searching, planning, and the basic tracker are free." },
    { q: "Can I compare programs?", a: "Yes. From results, add programs to Compare to view side-by-side." },
    { q: "How do I get deadlines into my calendar?", a: "Use Sync to Calendar — Google/Outlook integration coming soon." },
    { q: "Will AI fill my application?", a: "AI guides you, but you submit the application on each university’s official site." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section className="faq container glass">
      <h2>FAQ</h2>
      {qs.map((item, i) => (
        <details key={i} open={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </section>
  );
}

function FloatingHelp() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Ask anything about programs, requirements or deadlines." },
  ]);

  const send = () => {
    if (!msg.trim()) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setMsg("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            "Thanks! I’m a demo for now. Your teammate can wire me to the backend /chat endpoint.",
        },
      ]);
    }, 300);
  };

  return (
    <div className="dock">
      {!open && (
        <button className="fab" onClick={() => setOpen(true)} aria-label="Open chat">💬</button>
      )}
      {open && (
        <div className="chat glass">
          <div className="chat__top">
            <strong>Ask AI</strong>
            <button className="close" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chat__body">
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
            ))}
          </div>
          <div className="chat__input">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type your question…"
            />
            <button className="btn btn--primary" onClick={send}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FooterCTA() {
  return (
    <section className="cta container glass">
      <h2>Ready to start?</h2>
      <p className="subtitle">
        Search programs, save your shortlist, and let the assistant guide you through each step.
      </p>
      <a href="#search" className="btn btn--primary">Find programs</a>
    </section>
  );
}
