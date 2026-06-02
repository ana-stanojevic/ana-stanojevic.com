export function Hero() {
  return (
    <section id="top" className="hero hero--hiring" aria-label="Introduction">
      <div className="container hero__shell">
        <div className="hero-copy">
          <h1>Ana Stanojević</h1>
          <p className="hero-tagline">AI Engineer — PhD EPFL</p>
          <p className="hero-lede hero-lede--tight">AI systems built for real-world constraints.</p>
          <p className="hero-primary-cta">
            <a className="btn main" href="#contact">
              Contact
            </a>
            <a className="hero__secondary-link muted" href="#current-build">
              Current build
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

export function About() {
  return (
    <section id="about" className="section-about section-about--home" aria-labelledby="about-title">
      <div className="container">
        <h2 id="about-title" className="section-about__title">
          About
        </h2>
        <div className="section-about__text section-about__text--home">
          <p>PhD at EPFL with research experience across Huawei, IBM, and Google.</p>
          <p>Now focused on building real-world AI systems.</p>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer footer--simple">
      <div className="container footer-simple">
        <nav className="footer-simple__nav" aria-label="Footer">
          <a href="#top">Intro</a>
          <span className="footer-simple__sep" aria-hidden="true">·</span>
          <a href="#about">About</a>
          <span className="footer-simple__sep" aria-hidden="true">·</span>
          <a href="#current-build">Current build</a>
          <span className="footer-simple__sep" aria-hidden="true">·</span>
          <a href="#contact">Contact</a>
          <span className="footer-simple__gap" aria-hidden="true" />
          <a href="https://github.com/ana-stanojevic" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <span className="footer-simple__sep" aria-hidden="true">·</span>
          <a
            href="https://scholar.google.com/citations?user=3DNfrZYAAAAJ&hl=en&oi=ao"
            target="_blank"
            rel="noreferrer"
          >
            Scholar
          </a>
          <span className="footer-simple__sep" aria-hidden="true">·</span>
          <a href="/AnaStanojevicCV.pdf" target="_blank" rel="noreferrer">
            CV
          </a>
          <span className="footer-simple__sep" aria-hidden="true">·</span>
          <a href="https://www.youtube.com/@ana-stanojevic" target="_blank" rel="noreferrer">
            YouTube
          </a>
          <span className="footer-simple__sep" aria-hidden="true">·</span>
          <a href="mailto:contact@ana-stanojevic.com?subject=Reaching%20out%20via%20your%20site">Email</a>
        </nav>
        <p className="copyright copyright--simple">© {year} Ana Stanojević</p>
      </div>
    </footer>
  );
}
