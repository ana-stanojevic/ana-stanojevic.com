import { useEffect } from "react";

const LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/ana-stanojevic1/",
    external: true,
  },
  {
    label: "Website",
    href: "/",
    external: false,
  },
  {
    label: "GitHub",
    href: "https://github.com/ana-stanojevic",
    external: true,
  },
  {
    label: "Email",
    href: "mailto:contact@ana-stanojevic.com?subject=Reaching%20out%20via%20your%20site",
    external: false,
  },
] as const;

export default function ConnectLinks() {
  useEffect(() => {
    document.title = "Ana Stanojević — Connect";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Links to Ana Stanojević — LinkedIn, GitHub, email, and website."
      );
    }
  }, []);

  return (
    <div className="page-scaled connect-links-page">
      <main className="connect-links" aria-label="Connect links">
        <div className="connect-links__header">
          <img
            className="connect-links__avatar"
            src="/assets/profile.png"
            alt=""
            width={88}
            height={88}
          />
          <h1 className="connect-links__title">Ana Stanojević</h1>
          <p className="connect-links__tagline">AI Engineer | PhD EPFL | AI Systems</p>
        </div>

        <p className="connect-links__intro">Let&apos;s stay in touch.</p>

        <nav className="connect-links__nav" aria-label="External profiles">
          {LINKS.map(({ label, href, external }) => (
            <a
              key={label}
              className="connect-links__link"
              href={href}
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {label}
            </a>
          ))}
        </nav>
      </main>
    </div>
  );
}
