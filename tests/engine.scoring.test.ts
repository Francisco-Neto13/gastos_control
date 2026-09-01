import { describe, expect, it } from "vitest";
import { floorPreferenceScore, occupancyScore, proximityScore, resourceMatchScore } from "@/lib/engine/scoring";
import { makeRoom, makeTeam } from "./testUtils";

describe("Funções de pontuação (unitário)", () => {
  it("occupancyScore premia ocupação entre 70% e 100% e penaliza ociosidade", () => {
    expect(occupancyScore(90, 100)).toBe(100); // 90%
    expect(occupancyScore(70, 100)).toBe(100); // exatamente no limiar
    expect(occupancyScore(35, 100)).toBe(50); // 35% -> metade do limiar de 70%
    expect(occupancyScore(120, 100)).toBe(0); // impossível, nunca deveria ocorrer
  });

  it("floorPreferenceScore é neutro sem preferência e decresce com a distância", () => {
    const teamNoPref = makeTeam({ id: "t", size: 5, floorPreference: null });
    const teamPref = makeTeam({ id: "t", size: 5, floorPreference: 5 });
    expect(floorPreferenceScore(teamNoPref, makeRoom({ id: "r", floor: 9, capacity: 10 }))).toBe(60);
    expect(floorPreferenceScore(teamPref, makeRoom({ id: "r", floor: 5, capacity: 10 }))).toBe(100);
    expect(floorPreferenceScore(teamPref, makeRoom({ id: "r", floor: 6, capacity: 10 }))).toBe(80);
    expect(floorPreferenceScore(teamPref, makeRoom({ id: "r", floor: 9, capacity: 10 }))).toBe(20);
  });

  it("resourceMatchScore é neutro sem exigência e dá bônus por recursos extras", () => {
    const team = makeTeam({ id: "t", size: 5, requiredResources: ["projetor"] });
    const roomExact = makeRoom({ id: "r1", floor: 1, capacity: 10, resources: ["projetor"] });
    const roomExtra = makeRoom({ id: "r2", floor: 1, capacity: 10, resources: ["projetor", "som"] });
    expect(resourceMatchScore(team, roomExact)).toBe(80);
    expect(resourceMatchScore(team, roomExtra)).toBe(85);
  });

  it("proximityScore favorece o mesmo andar de equipes relacionadas", () => {
    const room = makeRoom({ id: "r", floor: 5, capacity: 10 });
    expect(proximityScore(room, [])).toBe(50);
    expect(proximityScore(room, [5])).toBe(100);
    expect(proximityScore(room, [4])).toBe(60);
    expect(proximityScore(room, [1])).toBe(20);
  });
});
