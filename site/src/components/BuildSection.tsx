const BUILD_SIGNALS = [
  "stateful runtime",
  "bounded autonomy",
  "uncertainty-aware",
  "tool-grounded execution",
  "policy-gated actions",
  "human final submit",
] as const;

function ArchDiagram() {
  return (
    <div
      className="jia-arch"
      role="img"
      aria-label="Three-layer autonomous runtime: intake and ranking, uncertainty-aware decision loop, execution and policy adaptation from outcomes with human final submit"
    >
      <div className="jia-arch__panel">
        <p className="jia-arch__input">
          <span className="jia-arch__input-k">INPUT</span>
          <span className="jia-arch__input-v">CV · job description · preferences</span>
        </p>
        <div className="jia-arch__tier jia-arch__tier--strategy" role="group" aria-label="Discovery layer">
          <span className="jia-arch__tier-k">① intake & ranking</span>
          <div className="jia-arch__tier-pills">
            <span className="jia-arch__pill">discover</span>
            <span className="jia-arch__pill">normalize</span>
            <span className="jia-arch__pill">filter</span>
            <span className="jia-arch__pill">rank</span>
          </div>
        </div>
        <span className="jia-arch__arrow jia-arch__arrow--accent" aria-hidden="true">
          ↓
        </span>
        <div className="jia-arch__queue" role="group" aria-label="Opportunity queue">
          <span className="jia-arch__queue-k">② opportunity queue</span>
          <span className="jia-arch__queue-sub">priority shortlist</span>
        </div>
        <span className="jia-arch__arrow jia-arch__arrow--accent" aria-hidden="true">
          ↓
        </span>
        <div className="jia-arch__tier jia-arch__tier--runtime" role="group" aria-label="Runtime layer">
          <span className="jia-arch__tier-k">② decision runtime (confidence · risk · cost)</span>
          <div className="jia-arch__tier-pills">
            <span className="jia-arch__pill">state</span>
            <span className="jia-arch__pill">policy gates</span>
            <span className="jia-arch__pill">expected value</span>
            <span className="jia-arch__pill">budget</span>
          </div>
        </div>
        <span className="jia-arch__arrow jia-arch__arrow--accent" aria-hidden="true">
          ↓
        </span>
        <div className="jia-arch__loop-card" role="group" aria-label="Agent loop">
          <div className="jia-arch__loop-head">
            <span className="jia-arch__loop-name">③ expected value decision loop</span>
          </div>
          <div className="jia-arch__loop-ring" aria-hidden="true">
            <svg className="jia-arch__loop-svg" viewBox="0 0 280 52" focusable="false">
              <path
                d="M 14 40 Q 140 8 266 40"
                fill="none"
                stroke="rgba(255,127,110,0.45)"
                strokeWidth="2"
                strokeDasharray="4 5"
              />
            </svg>
          </div>
          <div className="jia-arch__loop-track">
            <span className="jia-arch__node">plan</span>
            <span className="jia-arch__arr">→</span>
            <span className="jia-arch__node jia-arch__node--browser">select tool</span>
            <span className="jia-arch__arr">→</span>
            <span className="jia-arch__node">execute</span>
            <span className="jia-arch__arr">→</span>
            <span className="jia-arch__node jia-arch__node--signal">evaluate</span>
          </div>
          <span className="jia-arch__loop-decision-arr" aria-hidden="true">
            ↓
          </span>
          <div className="jia-arch__loop-decision" role="group" aria-label="Decision output">
            <span className="jia-arch__loop-decision-k">DECISION</span>
            <div className="jia-arch__loop-decision-row">
              <span className="jia-arch__d jia-arch__d--submit">prepare</span>
              <span className="jia-arch__d">queue</span>
              <span className="jia-arch__d">skip</span>
              <span className="jia-arch__d jia-arch__d--esc">escalate</span>
            </div>
          </div>
        </div>
        <span className="jia-arch__arrow jia-arch__arrow--accent" aria-hidden="true">
          ↓
        </span>
        <div className="jia-arch__exec-tier" role="group" aria-label="Output">
          <span className="jia-arch__exec-tier-k">④ execute decision</span>
          <div className="jia-arch__tier-pills">
            <span className="jia-arch__pill">prepare + human submit · requeue · skip · escalate</span>
          </div>
        </div>
        <span className="jia-arch__arrow jia-arch__arrow--accent" aria-hidden="true">
          ↓
        </span>
        <div className="jia-arch__mem" role="group" aria-label="Feedback">
          <span className="jia-arch__mem-line">⑤ policy adaptation</span>
          <p className="jia-arch__mem-fb">outcomes → ranking / thresholds / retries</p>
        </div>
        <p className="jia-arch__close-loop">feedback loop → queue ranking · policy tuning · escalation behavior</p>
      </div>
    </div>
  );
}

export default function BuildSection() {
  return (
    <section id="current-build" className="section-build section-build--split" aria-labelledby="build-title">
      <div className="container">
        <div className="section-build__split">
          <div className="section-build__split-main">
            <p className="section-build__eyebrow">Expected-value decision runtime</p>
            <h2 id="build-title" className="section-build__title">
              Bounded Job Application Agent
            </h2>
            <div className="section-build__intro">
              <p className="section-build__subtitle">
                Typical agents maximize activity. This system maximizes expected value under uncertainty, cost, and
                execution risk.
              </p>
              <p className="section-build__subtitle">
                Low-confidence opportunities are intentionally skipped. Quality over quantity is a design choice.
              </p>
            </div>
            <div className="section-build__block">
              <p className="section-build__block-k">Architecture</p>
              <p className="section-build__block-p">
                Intake → ranking → bounded decision runtime → execution → human submit
              </p>
            </div>
            <div className="section-build__block">
              <p className="section-build__block-k">Control &amp; adaptation</p>
              <p className="section-build__block-p">
                Decision loop selects next action: research / prepare application / queue / skip / escalate
              </p>
              <p className="section-build__block-p">Learning: outcomes update ranking, thresholds, retry policy</p>
            </div>
            <div className="section-build__block">
              <p className="section-build__block-k">Example run (real flow)</p>
              <p className="section-build__block-p">
                120 jobs → 18 filtered → 6 shortlisted → 2 prepared → 1 escalated → 1 submitted
              </p>
            </div>
            <ul className="section-build__signals" aria-label="Architecture signals">
              {BUILD_SIGNALS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="section-build__repo">
              <a
                href="https://github.com/ana-stanojevic/job-intelligence-agent"
                className="section-build__repo-link"
                target="_blank"
                rel="noreferrer"
              >
                VIEW REPO →
              </a>
            </p>
            <ul className="section-build__badges" aria-label="Build status">
              <li>
                <span className="home-build-badge">IN BUILD</span>
              </li>
              <li>
                <span className="home-build-badge home-build-badge--muted">DEMO SOON</span>
              </li>
            </ul>
          </div>
          <div className="section-build__split-visual">
            <div
              className="section-build__flow section-build__flow--diagram-only"
              aria-label="Layered autonomous job-search architecture"
            >
              <ArchDiagram />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
