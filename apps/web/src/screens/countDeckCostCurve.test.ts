import { describe, expect, it } from "vitest";
import { countDeckCostCurve, HIGHEST_COST_BUCKET } from "@/screens/countDeckCostCurve";

function countsByCost(main: Record<string, number>) {
  return Object.fromEntries(
    countDeckCostCurve({ main })
      .filter((bucket) => bucket.count > 0)
      .map((bucket) => [bucket.cost, bucket.count]),
  );
}

describe("countDeckCostCurve", () => {
  it("returns one empty bucket per cost from 0 up to the open-ended top bucket", () => {
    const buckets = countDeckCostCurve({ main: {} });

    expect(buckets.map((bucket) => bucket.cost)).toEqual(Array.from({ length: HIGHEST_COST_BUCKET + 1 }, (_, i) => i));
    expect(buckets.every((bucket) => bucket.count === 0)).toBe(true);
    expect(buckets.filter((bucket) => bucket.includesHigher).map((bucket) => bucket.cost)).toEqual([
      HIGHEST_COST_BUCKET,
    ]);
  });

  it("counts every copy by play cost across Digimon, Tamers and Options", () => {
    expect(countsByCost({ "BT1-009": 4, "BT1-010": 2, "BT1-085": 3, "BT1-090": 1 })).toEqual({
      0: 1,
      2: 4,
      3: 2,
      4: 3,
    });
  });

  it("groups play costs above the top bucket into it", () => {
    expect(countsByCost({ "BT1-084": 1, "EX1-073": 2, "BT1-114": 1 })).toEqual({ 8: 1, [HIGHEST_COST_BUCKET]: 3 });
  });

  it("skips Digi-Eggs, which have no play cost, and unknown cards", () => {
    expect(countsByCost({ "BT1-001": 4, "UNKNOWN-000": 2 })).toEqual({});
  });
});
