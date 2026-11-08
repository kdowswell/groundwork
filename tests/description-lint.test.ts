import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { DESCRIPTION_MAX, lintRouterDescription } from "../scripts/lint-description.js";
import { COMMAND_MAP, HAND_WRITTEN } from "../scripts/router-commands.js";

const COMMANDS = [...Object.keys(COMMAND_MAP), ...HAND_WRITTEN];
const ROUTER = matter(readFileSync(join(__dirname, "../skills/groundwork/SKILL.md"), "utf8")).data.description as string;

describe("router description lint (#49)", () => {
  it("passes for the shipped router", () => {
    expect(lintRouterDescription(ROUTER, COMMANDS)).toEqual([]);
  });

  it("flags a command the description forgets", () => {
    const without = ROUTER.replace("path-to-prod,", "");
    expect(lintRouterDescription(without, COMMANDS).join("\n")).toMatch(/doesn't name these commands.*path-to-prod/);
  });

  it("doesn't count a command that only appears inside another word", () => {
    expect(lintRouterDescription("Invoke when planning. Not for code. /groundwork data-model", ["model"]).join()).toMatch(/model/);
  });

  it("requires the invoke-when and not-for boundary, and the length limit", () => {
    const errors = lintRouterDescription(`${"x ".repeat(DESCRIPTION_MAX)} ${COMMANDS.join(", ")}`, COMMANDS);
    expect(errors.join("\n")).toMatch(/Agent Skills limit/);
    expect(errors.join("\n")).toMatch(/Invoke when/);
    expect(errors.join("\n")).toMatch(/Not for/);
  });
});
