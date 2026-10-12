import { useId } from "react";
import { ForumComposer } from "@/bugs/ForumComposer";
import { Dialog } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";

export function BugReportDialog({
  signedIn,
  onClose,
  matchLogId,
  accountId,
}: {
  signedIn: boolean;
  onClose: () => void;
  matchLogId?: string;
  accountId?: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <Dialog className="forum-dialog" labelledBy={id} onClose={onClose} closeOnBackdrop={false} closeOnEscape={false}>
      <h2 id={id} className="aegis-sr-only">
        {t("forum.newTopic")}
      </h2>
      <ForumComposer
        signedIn={signedIn}
        accountId={accountId}
        matchLogId={matchLogId}
        onCancel={onClose}
        onPublished={() => undefined}
        onSignIn={() => location.assign("/login")}
      />
    </Dialog>
  );
}
