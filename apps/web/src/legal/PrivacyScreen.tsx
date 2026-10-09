import type { ReactNode } from "react";
import { useTranslation } from "../i18n";
import { PRIVACY_CONTACT, PRIVACY_POLICIES, PRIVACY_UPDATED } from "./privacyPolicy";
import "./legal.css";

function withContact(text: string): ReactNode {
  const [before, after] = text.split("{contact}");
  if (after === undefined) return text;
  return (
    <>
      {before}
      <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>
      {after}
    </>
  );
}

export function PrivacyScreen() {
  const { locale } = useTranslation();
  const policy = PRIVACY_POLICIES[locale];
  const updated = new Date(`${PRIVACY_UPDATED}T00:00:00Z`).toLocaleDateString(locale, { timeZone: "UTC" });
  return (
    <main className="legal-page">
      <article className="aegis-page-sheet aegis-page-sheet--padded legal-page__sheet">
        <header className="legal-page__head">
          <h1>{policy.title}</h1>
          <p className="legal-page__updated">{policy.updated.replace("{date}", updated)}</p>
          <p>{withContact(policy.intro)}</p>
        </header>
        {policy.sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
            <h2 id={`${section.id}-heading`}>{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{withContact(paragraph)}</p>
            ))}
            {section.items ? (
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{withContact(item)}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </article>
    </main>
  );
}
