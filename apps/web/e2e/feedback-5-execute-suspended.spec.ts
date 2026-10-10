import { test, expect } from "./scenario-page";

const HOST_ID = "dev-perm-0-execute-host";
const executePrompt = /Execute/;

test("feedback #5: a host that already attacked gets no Execute prompt and stays on the field", async ({
  scenario,
}) => {
  await scenario.open("arena-feedback5-execute-suspended");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.attack(HOST_ID);
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      !s.combatWindow &&
      s.players[0]!.battleArea.find((p) => p.permanentId === HOST_ID)?.isSuspended === true,
  );

  const prompts: string[] = [];
  await scenario.page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil(
    (s) => s.turnSeat === 1 && !s.pendingDecision,
    (decision) => {
      prompts.push(`${decision.promptText} ${decision.options.effectText ?? ""}`);
      return { accept: false };
    },
  );

  expect(prompts.filter((prompt) => executePrompt.test(prompt))).toEqual([]);
  const host = (await scenario.snapshot()).players[0]!.battleArea.find((p) => p.permanentId === HOST_ID);
  expect(host?.topCard.cardId).toBe("EX12-047");
  expect(host?.stack.map((card) => card.cardId)).toEqual(["EX12-004", "EX12-063"]);
  await scenario.healthy();
});

test("feedback #5 control: an unsuspended host is offered Execute, and declining keeps it", async ({ scenario }) => {
  await scenario.open("arena-feedback5-execute-suspended");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);

  const prompts: string[] = [];
  await scenario.page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil(
    (s) => s.turnSeat === 1 && !s.pendingDecision,
    (decision) => {
      prompts.push(`${decision.promptText} ${decision.options.effectText ?? ""}`);
      return { accept: false };
    },
  );

  expect(prompts.filter((prompt) => executePrompt.test(prompt))).toHaveLength(1);
  const host = (await scenario.snapshot()).players[0]!.battleArea.find((p) => p.permanentId === HOST_ID);
  expect(host?.topCard.cardId).toBe("EX12-047");
  expect(host?.isSuspended).toBe(false);
  await scenario.healthy();
});
