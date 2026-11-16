import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { actionsReport, optionActions, templateActions } from "../tools/coverage/actions.mjs";
import { citationsReport, pagesOf } from "../tools/coverage/citations.mjs";
import { auditPacks, packsReport, RULE_CHECKS } from "../tools/coverage/packs.mjs";
import { openQuestions } from "../tools/coverage/questions.mjs";
import { rulesReport } from "../tools/coverage/rules.mjs";
import { settingsReport } from "../tools/coverage/settings.mjs";

/** A made-up repo: one rule file of three pages, a module, templates, Quench batches, and a pack. */
const fixture = fileURLToPath(new URL("fixtures/coverage/", import.meta.url));

/** The fixture's manifest: page 1 automated, page 2 left to the table, page 3 unclassified. */
const manifest = (changes = {}) => ({
  rules: [
    {
      file: "01_fixture.md",
      pages: "1",
      status: "automated",
      code: ["module/rule.js"],
      tests: ["tests/unit/rule-check.js"]
    },
    { file: "01_fixture.md", pages: "2", status: "manual", decision: "module/rule.js fixture" }
  ],
  untested: { actions: {}, settings: {} },
  ...changes
});

// roadmap/STAGE-16
describe("Coverage audit", () => {
  it("should read page lists", () => {
    expect(pagesOf("82")).toEqual([82]);
    expect(pagesOf("86-88, 90")).toEqual([86, 87, 88, 90]);
    expect(pagesOf("88-86")).toEqual([]);
    expect(pagesOf("p.82")).toEqual([]);
  });

  it("should list a page no manifest entry classifies, with its headings", () => {
    const { unclassified, stale } = rulesReport(fixture, manifest());
    expect(unclassified).toEqual([
      { file: "01_fixture.md", page: 3, headings: ["Unclassified Rule"] }
    ]);
    expect(stale).toEqual([]);
  });

  it("should list a manifest page its rule file does not mark", () => {
    const rules = [...manifest().rules, { file: "01_fixture.md", pages: "4", status: "advice" }];
    expect(rulesReport(fixture, manifest({ rules })).stale).toEqual(["01_fixture.md p.4"]);
  });

  it("should fail an automated entry whose code cites none of its pages", () => {
    const rules = [{ ...manifest().rules[0], code: ["module/uncited.js"] }];
    const { uncited, invalid } = citationsReport(fixture, manifest({ rules }));
    expect(invalid).toEqual([]);
    expect(uncited).toEqual(["01_fixture.md p.1: module/uncited.js cite none of its pages"]);
  });

  it("should fail an automated entry whose test path does not exist, and a manual one with no decision", () => {
    const rules = [
      { ...manifest().rules[0], tests: ["tests/unit/gone.js"] },
      { file: "01_fixture.md", pages: "2", status: "manual" }
    ];
    expect(citationsReport(fixture, manifest({ rules })).invalid).toEqual([
      "01_fixture.md p.1: tests path tests/unit/gone.js does not exist",
      "01_fixture.md p.2: a manual entry's decision starts with the existing file recording it"
    ]);
  });

  it("should fail a citation to a page no manifest entry covers", () => {
    const { uncovered, uncited } = citationsReport(fixture, manifest());
    expect(uncited).toEqual([]);
    expect(uncovered).toContain("module/rule.js:3 cites p.9");
    // A pack entry's page is a citation too
    expect(uncovered).toContain("src/packs/things.json:0 cites p.3");
  });

  it("should find template and option actions", () => {
    expect(templateActions('<a data-action="edit-item"></a><a data-action="{{x}}"></a>')).toEqual([
      "edit-item"
    ]);
    expect(
      templateActions(
        '{{> "systems/l5r4-enhanced/templates/cards/_partials/_roll-button.hbs" pool=x action="roll-skill"}}' +
          '<button type="button" data-action="{{action}}"></button>'
      )
    ).toEqual(["roll-skill"]);
    expect(
      optionActions("actions: { a: f, 'b-c': g, async d() { return { e: 1 }; }, ...h }")
    ).toEqual(["a", "b-c", "d"]);
  });

  it("should list an action no test triggers, and an accepted one no longer", async () => {
    const report = await actionsReport(fixture, manifest());
    expect(report.untested).toEqual([{ action: "lonely", source: "templates/sheet.hbs" }]);
    const accepted = await actionsReport(
      fixture,
      manifest({ untested: { actions: { lonely: "why", clicked: "why" }, settings: {} } })
    );
    expect(accepted.untested).toEqual([]);
    expect(accepted.stale).toEqual(["untested.actions accepts clicked, which is tested"]);
  });

  it("should list a setting no test sets", () => {
    expect(settingsReport(fixture, manifest()).untested).toEqual(["untested"]);
  });

  it("should fail a full or partial pack entry no batch checks, and a partial or none one left undecided", () => {
    const report = packsReport(fixture, manifest());
    expect(report.unchecked).toEqual([
      "things: Full Thing (p.1, full)",
      "things: Partial Thing (p.2, partial)"
    ]);
    expect(report.undecided).toEqual(["things: Bare Thing (p.3, none)"]);
    const checked = auditPacks({
      sources: [
        {
          name: "things",
          documentType: "Item",
          entries: [{ name: "A", page: 1, coverage: "full" }]
        }
      ],
      tests: `it("${RULE_CHECKS.Item}")`,
      rules: []
    });
    expect(checked.unchecked).toEqual([]);
  });

  it("should read a stage file's open questions, numbered or bulleted", () => {
    const stage =
      "## Decisions\n\n1. Done.\n\n### Still open\n\n1. First\n   wraps.\n- Second\n\n## Out of scope\n";
    expect(openQuestions(stage)).toEqual(["First wraps.", "Second"]);
    expect(openQuestions("### Still open\n\nNone.\n")).toEqual([]);
  });
});
