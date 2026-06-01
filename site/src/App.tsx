import { About, Footer, Hero } from "./components/StaticSections";
import BuildSection from "./components/BuildSection";
import Contact from "./components/Contact";

export default function App() {
  return (
    <div className="page-scaled">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <main id="main">
        <Hero />
        <About />
        <BuildSection />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
