import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AccountStore } from "../accounts/AccountStore.js";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import { NotificationStore } from "../notifications/NotificationStore.js";
import { PlaytestStore } from "./PlaytestStore.js";

let accounts: AccountStore;
let store: PlaytestStore;
let notifications: NotificationStore;
let kai: string;
let mika: string;

beforeEach(async () => {
  accounts = new AccountStore(createMemoryPool());
  store = new PlaytestStore(accounts);
  notifications = new NotificationStore(accounts);
  kai = (await accounts.accountForIdentity("discord", "kai", "Kai")).id;
  mika = (await accounts.accountForIdentity("discord", "mika", "Mika")).id;
});
afterEach(async () => {
  await accounts.close();
});

const study = (over: Partial<Parameters<PlaytestStore["createStudy"]>[0]> = {}) => ({
  title: "Deck builder interviews",
  blurb: "Thirty minutes on a call about how you build decks.",
  link: "https://cal.example/aegis",
  opensAt: 1_000,
  closesAt: 2_000_000,
  createdBy: kai,
  ...over,
});

describe("playtest membership", () => {
  it("is off until the player opts in, and remembers when they did", async () => {
    expect(await store.membership(kai)).toEqual({ member: false, since: null });
    expect(await store.setMembership(kai, true, 500)).toEqual({ member: true, since: 500 });
    expect(await store.membership(kai)).toEqual({ member: true, since: 500 });
    expect(await store.setMembership(kai, false)).toEqual({ member: false, since: null });
  });

  it("lists members oldest first with their display names", async () => {
    await store.setMembership(mika, true, 900);
    await store.setMembership(kai, true, 700);
    expect(await store.members()).toEqual([
      { id: kai, displayName: "Kai", since: 700 },
      { id: mika, displayName: "Mika", since: 900 },
    ]);
  });
});

describe("studies", () => {
  it("notifies every current member once, and no one else", async () => {
    await store.setMembership(kai, true, 500);
    const { study: created, notified } = await store.createStudy(study(), 1_500);
    expect(notified).toBe(1);
    expect(created).toMatchObject({ title: "Deck builder interviews", opensAt: 1_000, closesAt: 2_000_000 });
    const inbox = await notifications.list(kai);
    expect(inbox.items).toHaveLength(1);
    expect(inbox.items[0]).toMatchObject({
      kind: "playtest_study",
      payload: { studyId: created.id, title: "Deck builder interviews", link: "https://cal.example/aegis" },
    });
    expect((await notifications.list(mika)).items).toHaveLength(0);
  });

  it("notifies a player who opts in while a study is open, but not twice", async () => {
    const { study: created } = await store.createStudy(study(), 1_500);
    await store.setMembership(mika, true, 1_600);
    expect((await notifications.list(mika)).items.map((item) => item.kind)).toEqual(["playtest_study"]);
    await notifications.markRead(mika, "all");
    await store.setMembership(mika, false, 1_700);
    await store.setMembership(mika, true, 1_800);
    const items = (await notifications.list(mika)).items;
    expect(items).toHaveLength(1);
    expect(items[0]!.payload).toMatchObject({ studyId: created.id });
  });

  it("does not notify for a study that is closed or not yet open", async () => {
    await store.createStudy(study({ opensAt: 1_000, closesAt: 1_200 }), 1_100);
    await store.createStudy(study({ opensAt: 5_000_000, closesAt: 6_000_000 }), 1_100);
    await store.setMembership(kai, true, 2_000);
    expect((await notifications.list(kai)).items).toHaveLength(0);
  });

  it("splits open and past studies at the given moment", async () => {
    await store.createStudy(study({ title: "Old", opensAt: 1, closesAt: 10 }), 5);
    await store.createStudy(study({ title: "Now", opensAt: 1, closesAt: 10_000 }), 5);
    const { open, past } = await store.studies(100);
    expect(open.map((item) => item.title)).toEqual(["Now"]);
    expect(past.map((item) => item.title)).toEqual(["Old"]);
  });
});
