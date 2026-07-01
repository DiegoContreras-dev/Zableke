import assert from "node:assert/strict";
import test from "node:test";

import { countOpenSlotsForToday } from "@/frontend/modules/admin-dashboard/lib/home-stats";

function offering(status: string, dayOfWeeks: string[]) {
  return {
    status,
    slots: dayOfWeeks.map((dayOfWeek) => ({ dayOfWeek })),
  };
}

test("countOpenSlotsForToday cuenta solo slots de ofertas OPEN en el día actual", () => {
  const monday = new Date("2026-07-06T12:00:00"); // lunes
  const offerings = [
    offering("OPEN", ["MONDAY", "TUESDAY"]),
    offering("OPEN", ["MONDAY"]),
    offering("CLOSED", ["MONDAY"]),
  ];
  assert.equal(countOpenSlotsForToday(offerings, monday), 2);
});

test("countOpenSlotsForToday retorna 0 los domingos (no existe el enum SUNDAY)", () => {
  const sunday = new Date("2026-07-05T12:00:00"); // domingo
  const offerings = [offering("OPEN", ["MONDAY", "TUESDAY", "SATURDAY"])];
  assert.equal(countOpenSlotsForToday(offerings, sunday), 0);
});

test("countOpenSlotsForToday retorna 0 si no hay ofertas", () => {
  assert.equal(countOpenSlotsForToday([], new Date("2026-07-06T12:00:00")), 0);
});
