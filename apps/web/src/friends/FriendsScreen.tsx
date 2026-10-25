import { FriendListItem } from "@/friends/FriendListItem";
import { useEffect, useState, type FormEvent } from "react";
import type { Friend } from "@aegis/shared/friends/Friend";
import type { FriendRequest } from "@aegis/shared/friends/FriendRequest";
import { Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import type { TranslationKey } from "@/i18n/translationTypes";
import { friendsApi } from "@/friends/friendsApi";
import { getFriendErrorKey } from "@/friends/getFriendErrorKey";
import "@/friends/friends.css";

type FriendsScreenParams = { signedIn: boolean; onSignIn: () => void };
type FriendsData = { friends: Friend[]; requests: FriendRequest[]; blocks: Friend[] };

export function FriendsScreen({ signedIn, onSignIn }: FriendsScreenParams) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<keyof FriendsData>("friends");
  const [data, setData] = useState<FriendsData>();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<TranslationKey>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!signedIn) {
      setData(undefined);
      return;
    }
    let active = true;
    setFailed(false);
    void Promise.all([friendsApi.list(), friendsApi.requests(), friendsApi.blocks()])
      .then(([friends, requests, blocks]) => {
        if (active) {
          setData({ ...friends, ...requests, ...blocks });
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [signedIn, revision]);

  async function runAction(action: () => Promise<unknown>) {
    setBusy(true);
    setNotice(undefined);
    try {
      await action();
      setRevision((value) => value + 1);
    } catch (error) {
      setNotice(getFriendErrorKey(error));
    } finally {
      setBusy(false);
    }
  }

  function addFriend(event: FormEvent) {
    event.preventDefault();
    void runAction(async () => {
      const result = await friendsApi.add({ displayName: name.trim() });
      setNotice(result.accepted ? "friends.accepted" : "friends.sent");
      setName("");
    });
  }

  return (
    <main className="friends-screen">
      <header>
        <h1>{t("friends.title")}</h1>
        <p>{t("friends.description")}</p>
      </header>
      {!signedIn ? (
        <Button onClick={onSignIn}>{t("friends.signIn")}</Button>
      ) : (
        <>
          <form className="friends-form" onSubmit={addFriend}>
            <label htmlFor="friend-display-name">{t("friends.displayName")}</label>
            <div>
              <input
                id="friend-display-name"
                autoComplete="off"
                maxLength={32}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              <Button disabled={busy || !name.trim()} type="submit">
                {t("friends.add")}
              </Button>
            </div>
          </form>
          <nav className="friends-tabs" aria-label={t("friends.title")}>
            {(["friends", "requests", "blocks"] as const).map((key) => (
              <button key={key} aria-current={tab === key ? "page" : undefined} onClick={() => setTab(key)}>
                {t(`friends.tab.${key}`)}
                {data ? ` (${data[key].length})` : ""}
              </button>
            ))}
          </nav>
          {notice ? <p role="status">{t(notice)}</p> : null}
          {failed ? (
            <div role="alert">
              <p>{t("friends.failed")}</p>
              <Button onClick={() => setRevision((value) => value + 1)}>{t("friends.retry")}</Button>
            </div>
          ) : null}
          {!data && !failed ? (
            <p role="status" aria-busy="true">
              {t("common.loading")}
            </p>
          ) : null}
          {data ? (
            <section aria-label={t(`friends.tab.${tab}`)} aria-busy={busy}>
              {data[tab].length === 0 ? <p className="friends-empty">{t(`friends.empty.${tab}`)}</p> : null}
              <ul className="friends-list">
                {data[tab].map((friend) => (
                  <FriendListItem key={friend.accountId} friend={friend} tab={tab} busy={busy} onAction={runAction} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
