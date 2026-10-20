import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KEYWORD_GLOSSARY } from "@/game/keywordGlossary";
import { keywordDrills } from "@aegis/shared/tutorial/keywordDrills";
import { rulePracticeLessons } from "@aegis/shared/tutorial/rulePracticeLessons";
import { findTutorialLesson } from "@aegis/shared/tutorial/findTutorialLesson";
import { en } from "@/i18n/en";
import { ptBR } from "@/i18n/pt-BR";
import { rulesChapterBattles } from "@/learn/rules/rulesChapterBattles";
import type { TranslationKey } from "@/i18n/translationTypes";
import { getOfficialRuleUrl } from "@/learn/rules/getOfficialRuleUrl";
import { getRulesGuideChapters } from "@/learn/rules/getRulesGuideChapters";
import { rulesChapters } from "@/learn/rules/rulesChapters";
import { tutorialLessons } from "@aegis/shared/tutorial/tutorialLessons";
import { lessonGroups } from "@/learn/lessonGroups";
import { getLessonRuleReferences } from "@/learn/getLessonRuleReferences";
import { advancedPracticeLessons } from "@aegis/shared/tutorial/advancedPracticeLessons";
import { rulesChapterGroups } from "@/learn/rules/rulesChapterGroups";

const manual = readFileSync(new URL("../../../../../data/kb/rules/comprehensive.md", import.meta.url), "utf8").split(
  "\nUpdate History\n",
)[0]!;
const officialRules = new Set(Array.from(manual.matchAll(/^(\d+(?:-\d+)+)\./gm), (match) => match[1]!));
const subsections = Array.from(manual.matchAll(/^(\d+-\d+)\./gm), (match) => match[1]!);
const english = getRulesGuideChapters("en");
const portuguese = getRulesGuideChapters("pt-BR");

function getCitedRules(rule: string): string[] {
  const expanded = rule.replace(/(\d+(?:-\d+)+)\s*–\s*(\d+(?:-\d+)+)/g, (_range, start: string, end: string) => {
    const first = start.split("-");
    const last = end.split("-");
    const firstNumber = Number(first.pop());
    const lastNumber = Number(last.pop());
    if (first.join("-") !== last.join("-") || lastNumber < firstNumber) {
      return `${start}, ${end}`;
    }
    return Array.from({ length: lastNumber - firstNumber + 1 }, (_, index) =>
      [...first, firstNumber + index].join("-"),
    ).join(", ");
  });
  return expanded.match(/\b\d+(?:-\d+)+\b/g) ?? [];
}

describe("the official rules guide", () => {
  it("organizes every distinct lesson and keyword battle once with valid official references", () => {
    const lessons = lessonGroups.flatMap((group) => group.lessons);
    const expected = [
      ...tutorialLessons,
      ...keywordDrills,
      ...rulePracticeLessons.filter((lesson) =>
        ["practice-game-preparation", "practice-rule-checks"].includes(lesson.id),
      ),
      ...advancedPracticeLessons,
    ];
    expect(lessons.map((lesson) => lesson.id).sort()).toEqual(expected.map((lesson) => lesson.id).sort());
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(lessons.length);
    for (const lesson of lessons) {
      expect(getLessonRuleReferences(lesson).length).toBeGreaterThan(0);
      expect(getLessonRuleReferences(lesson).filter((rule) => !officialRules.has(rule))).toEqual([]);
      expect(rulesChapters.some((chapter) => chapter.id === lesson.rulesChapterId)).toBe(true);
    }
  });
  it("groups every chapter once and exposes the complex matches in the effects chapter", () => {
    expect(rulesChapterGroups.flatMap((group) => group.chapterIds)).toEqual(rulesChapters.map((chapter) => chapter.id));
    expect(rulesChapterBattles.effects).toEqual(advancedPracticeLessons.map((lesson) => lesson.id));
    expect(lessonGroups.find((group) => group.id === "advanced-effects")?.lessons.map((lesson) => lesson.id)).toEqual(
      advancedPracticeLessons.map((lesson) => lesson.id),
    );
  });
  it("covers every numbered subsection of the official manual", () => {
    const cited = [
      ...english.flatMap((chapter) => chapter.topics.flatMap((topic) => getCitedRules(topic.rule))),
      ...Object.values(KEYWORD_GLOSSARY).map((keyword) => keyword.rule),
    ];
    const covered = new Set(cited.map((rule) => rule.split("-").slice(0, 2).join("-")));
    expect(subsections.filter((rule) => !covered.has(rule))).toEqual([]);
  });

  it("uses printed rule numbers that exist in the official source", () => {
    const cited = english.flatMap((chapter) => chapter.topics.flatMap((topic) => getCitedRules(topic.rule)));
    expect(cited.filter((rule) => !officialRules.has(rule))).toEqual([]);
    expect(getOfficialRuleUrl("16-47")).toBe("https://world.digimoncard.com/rule/pdf/general_rule.pdf#page=35");
  });

  it("provides the same chapters, references and detailed topics in Portuguese and English", () => {
    expect(english.map((chapter) => chapter.id)).toEqual(rulesChapters.map((chapter) => chapter.id));
    expect(
      portuguese.map((chapter) => ({ id: chapter.id, topics: chapter.topics.map(({ id, rule }) => ({ id, rule })) })),
    ).toEqual(
      english.map((chapter) => ({ id: chapter.id, topics: chapter.topics.map(({ id, rule }) => ({ id, rule })) })),
    );
    for (const chapter of [...english, ...portuguese]) {
      expect(chapter.title.trim()).not.toBe("");
      expect(chapter.topics.length).toBeGreaterThan(0);
      for (const topic of chapter.topics) {
        expect(topic.body.trim()).not.toBe("");
      }
    }
  });

  it("offers a real guided match for every official keyword and rules chapter", () => {
    const expected = Object.keys(KEYWORD_GLOSSARY).sort();
    expect(keywordDrills.map((drill) => drill.keyword).sort()).toEqual(expected);
    for (const chapter of rulesChapters) {
      expect(rulesChapterBattles[chapter.id].length).toBeGreaterThan(0);
      for (const id of rulesChapterBattles[chapter.id]) {
        expect(findTutorialLesson(id)).toBeDefined();
        expect(findTutorialLesson(id)?.prerequisiteId).toBeUndefined();
      }
    }
  });

  it("provides briefing and every coached step in Portuguese and English for each playable example", () => {
    for (const lesson of [...keywordDrills, ...rulePracticeLessons]) {
      const fields = ["title", "summary", "goal1", "goal2", "done"];
      const keys = [
        ...fields.map((field) => `learn.lesson.${lesson.id}.${field}`),
        ...lesson.steps.flatMap((step) => [
          `learn.lesson.${lesson.id}.step.${step.id}`,
          `learn.lesson.${lesson.id}.step.${step.id}.hint`,
        ]),
      ] as TranslationKey[];
      for (const key of keys) {
        expect(en[key]).toBeTruthy();
        expect(ptBR[key]).toBeTruthy();
      }
    }
  });
});
