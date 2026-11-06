import { describe, expect, it } from "vitest";
import type { CursorParameterizedModel } from "../src/client/cursor-wire.js";
import { augmentCursorModels } from "../src/models/parameterized.js";
import { processModels } from "../src/models/processing.js";

// Shape returned by Cursor's AvailableModels for the "Auto" picker (Intelligence / Balance / Cost).
const autoSmart: CursorParameterizedModel = {
  name: "auto-smart",
  clientDisplayName: "Auto",
  serverModelName: "auto-smart",
  supportsImages: true,
  supportsMaxMode: true,
  supportsNonMaxMode: true,
  variants: [
    {
      parameters: [{ id: "optimize_for", value: "intelligence" }],
      isMaxMode: false,
      displayName: "Auto Intelligence",
    },
    {
      parameters: [{ id: "optimize_for", value: "balanced" }],
      isMaxMode: false,
      isDefaultMaxConfig: true,
      isDefaultNonMaxConfig: true,
      displayName: "Auto Balance",
    },
    {
      parameters: [{ id: "optimize_for", value: "cost" }],
      isMaxMode: false,
      displayName: "Auto Cost",
    },
  ],
};

function nonMaxAutoRows() {
  return augmentCursorModels([], [autoSmart]).filter(
    (model) => model.requestedModelId === "auto-smart" && !model.requestedMaxMode,
  );
}

describe("auto-smart optimize_for variants", () => {
  it("exposes one selectable row per optimize_for value", () => {
    const byId = new Map(nonMaxAutoRows().map((model) => [model.id, model]));

    expect(byId.get("auto-smart-cost")?.parameters).toEqual([{ id: "optimize_for", value: "cost" }]);
    expect(byId.get("auto-smart-balanced")?.parameters).toEqual([
      { id: "optimize_for", value: "balanced" },
    ]);
    expect(byId.get("auto-smart-intelligence")?.parameters).toEqual([
      { id: "optimize_for", value: "intelligence" },
    ]);
    expect(byId.get("auto-smart-cost")?.name).toBe("Auto Cost");
  });

  it("keeps the original auto-smart id on Cursor's default variant", () => {
    const original = nonMaxAutoRows().find((model) => model.id === "auto-smart");
    expect(original?.parameters).toEqual([{ id: "optimize_for", value: "balanced" }]);
  });

  it("survives processModels without collapsing the variants back together", () => {
    const ids = processModels(augmentCursorModels([], [autoSmart])).map((model) => model.id);
    expect(ids).toEqual(
      expect.arrayContaining(["auto-smart-cost", "auto-smart-balanced", "auto-smart-intelligence"]),
    );
  });

  it("does not rename models whose variants never collide", () => {
    const single: CursorParameterizedModel = {
      ...autoSmart,
      variants: [autoSmart.variants[2]!],
    };
    const ids = augmentCursorModels([], [single])
      .filter((model) => !model.requestedMaxMode)
      .map((model) => model.id);
    expect(ids).toEqual(["auto-smart"]);
  });
});
