import { useTranslation } from "../i18n";

/** Fixture selection belongs to local tooling, where the server receives its preparation. */
export function LocalScenarioHelp() {
  const { locale } = useTranslation();
  const portuguese = locale === "pt-BR";
  return (
    <main className="aegis-effects-lab-panel-body">
      <h1>{portuguese ? "Cenários locais" : "Local scenarios"}</h1>
      <p>
        {portuguese
          ? "Abra uma fixture pelo terminal. O comando inicia a partida e abre o navegador."
          : "Open a fixture from the terminal. The command starts the match and opens your browser."}
      </p>
      <pre>
        <code>pnpm scenario open &lt;behavior&gt; --lab</code>
      </pre>
      <p>
        {portuguese
          ? "Para uma reprodução temporária, use um arquivo em .local/scenarios/."
          : "For a temporary reproduction, use a file in .local/scenarios/."}
      </p>
      <pre>
        <code>pnpm scenario open .local/scenarios/my-case.fixture.ts</code>
      </pre>
    </main>
  );
}
