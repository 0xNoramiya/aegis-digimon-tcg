import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MatchReplayLogWriter } from "#api/replays/inputs/MatchReplayLogWriter";
import { matchReplayLogDirectory } from "#api/replays/inputs/matchReplayLogDirectory";

const FIRST_MATCH = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const SECOND_MATCH = "22222222-2222-4222-8222-222222222222";

let logDirectory: string;

beforeEach(() => {
  logDirectory = mkdtempSync(join(tmpdir(), "aegis-match-replay-log-"));
});

afterEach(() => rmSync(logDirectory, { recursive: true, force: true }));

describe("per-match replay logs", () => {
  it("creates the folder on first write and keeps each match's lines in write order", async () => {
    const writer = new MatchReplayLogWriter(logDirectory);
    for (let index = 0; index < 50; index++) {
      writer.write(FIRST_MATCH, `${JSON.stringify({ match: 1, index })}\n`);
      writer.write(SECOND_MATCH, `${JSON.stringify({ match: 2, index })}\n`);
    }
    await writer.close();

    const read = (matchId: string) =>
      readFileSync(join(matchReplayLogDirectory(logDirectory), `${matchId}.jsonl`), "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line).index);
    const expected = Array.from({ length: 50 }, (_, index) => index);
    expect(read(FIRST_MATCH)).toEqual(expected);
    expect(read(SECOND_MATCH)).toEqual(expected);
  });

  it("refuses a match id that is not a UUID instead of using it in a path", async () => {
    const writer = new MatchReplayLogWriter(join(logDirectory, "logs"));
    for (const matchId of ["../escape", `../../${FIRST_MATCH}`, FIRST_MATCH.toUpperCase(), ""])
      writer.write(matchId, "{}\n");
    await writer.close();

    expect(readdirSync(logDirectory)).toEqual([]);
  });

  it("reports a failed write without throwing, so the match continues", async () => {
    const blocked = join(logDirectory, "not-a-directory");
    writeFileSync(blocked, "");
    const report = vi.fn<(error: unknown) => void>();
    const writer = new MatchReplayLogWriter(blocked, report);

    expect(() => writer.write(FIRST_MATCH, "{}\n")).not.toThrow();
    await writer.close();

    expect(report).toHaveBeenCalledWith(expect.objectContaining({ code: "ENOTDIR" }));
  });

  it("removes match logs last written more than 12 hours ago and keeps other files", async () => {
    const directory = matchReplayLogDirectory(logDirectory);
    mkdirSync(directory, { recursive: true });
    const now = Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;
    const lastWritten = {
      [`${FIRST_MATCH}.jsonl`]: now - twelveHours - 60_000,
      [`${SECOND_MATCH}.jsonl`]: now - twelveHours + 60_000,
      "notes.txt": now - 30 * twelveHours,
    };
    for (const [name, at] of Object.entries(lastWritten)) {
      writeFileSync(join(directory, name), "{}\n");
      utimesSync(join(directory, name), new Date(at), new Date(at));
    }
    const writer = new MatchReplayLogWriter(logDirectory);

    await writer.prune(now);
    await writer.close();

    expect(existsSync(join(directory, `${FIRST_MATCH}.jsonl`))).toBe(false);
    expect(readdirSync(directory).sort()).toEqual([`${SECOND_MATCH}.jsonl`, "notes.txt"]);
  });
});
