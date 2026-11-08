import { useState } from "react";
import { Button } from "../design/primitives";
import { useTranslation } from "../i18n";
import "./RankedConfirmDialog.css";

export function RankedConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (skipNextTime: boolean) => void;
}) {
  const { t } = useTranslation();
  const [skipNextTime, setSkipNextTime] = useState(false);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ranked-title" className="ranked-confirm">
      <div className="ranked-confirm__dialog aegis-dialog">
        <header className="aegis-dialog__header">
          <span className="aegis-dialog__eyebrow">{t("redesign.shell.ranked.eyebrow")}</span>
          <strong id="ranked-title" className="aegis-dialog__title">
            {t("ranked.confirmTitle")}
          </strong>
        </header>
        <p className="ranked-confirm__body">{t("ranked.confirmBody")}</p>
        <label className="ranked-confirm__skip">
          <input type="checkbox" checked={skipNextTime} onChange={(event) => setSkipNextTime(event.target.checked)} />
          {t("ranked.dontShowAgain")}
        </label>
        <div className="ranked-confirm__actions">
          <Button size="sm" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={() => onConfirm(skipNextTime)}>
            {t("common.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
