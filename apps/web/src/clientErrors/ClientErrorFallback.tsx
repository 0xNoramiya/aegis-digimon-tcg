import { Button } from "@/design/primitives";
import { Panel } from "@/design/surfaces";
import { useTranslation } from "@/i18n/useTranslation";

type ClientErrorFallbackProps = {
  loadFailed: boolean;
};

export function ClientErrorFallback({ loadFailed }: ClientErrorFallbackProps) {
  const { t } = useTranslation();
  return (
    <main className="aegis-startup" role="alert">
      <Panel as="div" className="aegis-startup__panel">
        <h1>{t(loadFailed ? "redesign.shell.loadFailed.title" : "redesign.shell.crash.title")}</h1>
        <p className="aegis-hero-panel__muted">
          {t(loadFailed ? "redesign.shell.loadFailed.body" : "redesign.shell.crash.body")}
        </p>
        <Button sound={false} onClick={() => window.location.reload()}>
          {t("redesign.shell.crash.reload")}
        </Button>
      </Panel>
    </main>
  );
}
