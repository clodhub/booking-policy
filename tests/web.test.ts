import assert from "node:assert/strict";
import test from "node:test";
import * as web from "../implementation/web/index.ts";
import * as server from "../implementation/server/index.ts";
import {
  DEFAULT_SETTINGS, cardConsumedByCancellation, checkDuration, checkoutExpiry, depositAndBalance, freeCancellation, freeCancellationDeadline,
  holdActive, installedSettings, refundEligible, settingsFrom,
} from "../implementation/web/index.ts";
import { amounts } from "./fixtures/source-amounts.ts";
import { importRendered, placeholders } from "./render.ts";
import { bookingTerms } from "../examples/consumer.ts";

const template = new URL("../implementation/web/settings.ts", import.meta.url);
const HOUR = 3_600_000;
const MINUTE = 60_000;
const start = new Date("2026-03-10T09:00:00Z");
const before = (ms: number) => new Date(start.getTime() - ms);

test("the settings template names only the declared settings and renders to the defaults", async () => {
  assert.deepEqual(placeholders(template).sort(), ["checkoutMinutes", "depositPercent", "freeCancellationHours", "holdMinutes", "maximumMinutes", "minimumMinutes"]);
  // The defaults declared in authoring/spec.json collect.
  const values = { depositPercent: 50, freeCancellationHours: 24, holdMinutes: 40, checkoutMinutes: 35, minimumMinutes: 15, maximumMinutes: 360 };
  const rendered = await importRendered<{ rawSettings: Record<string, string> }>(template, values);
  assert.deepEqual(rendered.rawSettings, Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)])));
  assert.deepEqual(settingsFrom(rendered.rawSettings), DEFAULT_SETTINGS);
  assert.deepEqual(installedSettings(), values);
  assert.deepEqual(settingsFrom({ depositPercent: "0", freeCancellationHours: "48" }), { ...DEFAULT_SETTINGS, depositPercent: 0, freeCancellationHours: 48 });
  assert.deepEqual(settingsFrom({ depositPercent: 100, checkoutMinutes: 31, holdMinutes: 31 }), { ...DEFAULT_SETTINGS, depositPercent: 100, checkoutMinutes: 31, holdMinutes: 31 });
  for (const bad of [{ depositPercent: "101" }, { depositPercent: "-1" }, { depositPercent: "half" }, { freeCancellationHours: 1.5 }, { checkoutMinutes: "30" },
    { checkoutMinutes: "1441" }, { holdMinutes: "34" }, { minimumMinutes: "0" }, { minimumMinutes: "400" }, { maximumMinutes: "1441" }]) {
    assert.throws(() => settingsFrom(bad), RangeError, JSON.stringify(bad));
  }
});

test("the web and server entry modules are the same", () => {
  assert.deepEqual(Object.keys(server).sort(), Object.keys(web).sort());
  for (const [name, value] of Object.entries(web)) assert.equal((server as Record<string, unknown>)[name], value, name);
});

test("depositAndBalance gives the source's giftCardAmounts at 50% (run by a copy of the source)", () => {
  for (const item of amounts) {
    assert.deepEqual(depositAndBalance(item.total, item.cardValue, 50), { deposit: item.depositCents, balance: item.balanceCents }, `${item.total} ${item.cardValue}`);
  }
});

test("depositAndBalance at other percentages; the deposit and the card never take more than the total", () => {
  assert.deepEqual(depositAndBalance(15500, 0, 30), { deposit: 4650, balance: 10850 });
  assert.deepEqual(depositAndBalance(15500, 0, 0), { deposit: 0, balance: 15500 });
  assert.deepEqual(depositAndBalance(15500, 0, 100), { deposit: 15500, balance: 0 });
  assert.deepEqual(depositAndBalance(15500, 6000, 100), { deposit: 9500, balance: 0 });
  assert.deepEqual(depositAndBalance(15500, 20000, 100), { deposit: 0, balance: 0 });
  assert.deepEqual(depositAndBalance(999, 0, 33), { deposit: 330, balance: 669 });
  assert.deepEqual(depositAndBalance(1, 0, 50), { deposit: 1, balance: 0 });
  for (const [total, card, percent] of [[-1, 0, 50], [100.5, 0, 50], [100, -1, 50], [100, 0, 101], [100, 0, 12.5]]) {
    assert.throws(() => depositAndBalance(total, card, percent), RangeError, `${total} ${card} ${percent}`);
  }
});

test("freeCancellationDeadline is the free period before the start", () => {
  assert.deepEqual(freeCancellationDeadline(start, 24), new Date("2026-03-09T09:00:00Z"));
  assert.deepEqual(freeCancellationDeadline(start, 48), new Date("2026-03-08T09:00:00Z"));
  assert.deepEqual(freeCancellationDeadline(start, 0), start);
  assert.throws(() => freeCancellationDeadline(new Date("not a date"), 24), RangeError);
  assert.throws(() => freeCancellationDeadline(start, -1), RangeError);
});

test("refundEligible: the owner always, the customer only more than the free period ahead, and only with a deposit", () => {
  const terms = (now: Date, by: "customer" | "owner", hasDeposit: boolean) => ({ startsAt: start, now, by, freeCancellationHours: 24, hasDeposit });
  assert.equal(refundEligible(terms(before(25 * HOUR), "customer", true)), true);
  assert.equal(refundEligible(terms(before(24 * HOUR + 1), "customer", true)), true);
  assert.equal(refundEligible(terms(before(24 * HOUR), "customer", true)), false);
  assert.equal(refundEligible(terms(before(2 * HOUR), "customer", true)), false);
  assert.equal(refundEligible(terms(before(2 * HOUR), "owner", true)), true);
  assert.equal(refundEligible(terms(new Date(start.getTime() + HOUR), "owner", true)), true);
  assert.equal(refundEligible(terms(before(25 * HOUR), "customer", false)), false);
  assert.equal(refundEligible(terms(before(2 * HOUR), "owner", false)), false);
  assert.equal(refundEligible({ startsAt: start, now: before(2 * HOUR), by: "customer", freeCancellationHours: 0, hasDeposit: true }), true);
});

test("freeCancellation is the same rule without the deposit", () => {
  const terms = (now: Date, by: "customer" | "owner") => ({ startsAt: start, now, by, freeCancellationHours: 24 });
  assert.equal(freeCancellation(terms(before(25 * HOUR), "customer")), true);
  assert.equal(freeCancellation(terms(before(24 * HOUR), "customer")), false);
  assert.equal(freeCancellation(terms(before(HOUR), "owner")), true);
  assert.throws(() => freeCancellation({ startsAt: start, now: new Date(Number.NaN), by: "customer", freeCancellationHours: 24 }), RangeError);
});

test("cardConsumedByCancellation: a late customer cancellation uses up the gift card, with or without a deposit", () => {
  const terms = (now: Date, by: "customer" | "owner", hasCard: boolean) => ({ startsAt: start, now, by, freeCancellationHours: 24, hasCard });
  assert.equal(cardConsumedByCancellation(terms(before(2 * HOUR), "customer", true)), true);
  assert.equal(cardConsumedByCancellation(terms(before(24 * HOUR), "customer", true)), true);
  assert.equal(cardConsumedByCancellation(terms(before(25 * HOUR), "customer", true)), false);
  assert.equal(cardConsumedByCancellation(terms(before(2 * HOUR), "owner", true)), false);
  assert.equal(cardConsumedByCancellation(terms(before(2 * HOUR), "customer", false)), false);
  // A booking the card paid for in full has no deposit; cancelling it early still keeps the card.
  const early = { startsAt: start, now: before(25 * HOUR), by: "customer" as const, freeCancellationHours: 24 };
  assert.equal(refundEligible({ ...early, hasDeposit: false }), false);
  assert.equal(cardConsumedByCancellation({ ...early, hasCard: true }), false);
});

test("holdActive: a booking waiting for payment holds its time for holdMinutes", () => {
  const now = new Date("2026-03-02T12:00:00Z");
  assert.equal(holdActive(new Date(now.getTime() - 39 * MINUTE), now, 40), true);
  assert.equal(holdActive(new Date(now.getTime() - 40 * MINUTE + 1), now, 40), true);
  assert.equal(holdActive(new Date(now.getTime() - 40 * MINUTE), now, 40), false);
  assert.equal(holdActive(new Date(now.getTime() - 2 * HOUR), now, 40), false);
  assert.equal(holdActive(now, now, 40), true);
  assert.throws(() => holdActive(new Date("x"), now, 40), RangeError);
  assert.throws(() => holdActive(now, now, -5), RangeError);
});

test("checkoutExpiry: whole seconds, checkoutMinutes ahead, from 31 minutes to a day", () => {
  const now = new Date("2026-03-02T12:00:00.750Z");
  // The source: Math.floor(Date.now() / 1000) + 35 * 60 seconds.
  assert.deepEqual(checkoutExpiry(now, 35), new Date((Math.floor(now.getTime() / 1000) + 35 * 60) * 1000));
  assert.deepEqual(checkoutExpiry(now, 35), new Date("2026-03-02T12:35:00.000Z"));
  assert.deepEqual(checkoutExpiry(now, 31), new Date("2026-03-02T12:31:00.000Z"));
  assert.deepEqual(checkoutExpiry(now, 1440), new Date("2026-03-03T12:00:00.000Z"));
  for (const minutes of [30, 1441, 35.5]) assert.throws(() => checkoutExpiry(now, minutes), RangeError, String(minutes));
});

test("checkDuration accepts whole minutes within the settings", () => {
  assert.deepEqual(checkDuration(15, DEFAULT_SETTINGS), { ok: true });
  assert.deepEqual(checkDuration(360, DEFAULT_SETTINGS), { ok: true });
  assert.deepEqual(checkDuration(125, DEFAULT_SETTINGS), { ok: true });
  for (const minutes of [14, 361, 0, -30, 60.5, Number.NaN, "60", null, undefined]) {
    assert.deepEqual(checkDuration(minutes, DEFAULT_SETTINGS), { ok: false, code: "INVALID_DURATION" }, String(minutes));
  }
  assert.deepEqual(checkDuration(10, { minimumMinutes: 5, maximumMinutes: 30 }), { ok: true });
});

test("the example works out Example Studio's deposit and cancellation terms", () => {
  const startsAt = new Date("2026-03-10T09:00:00Z");
  assert.deepEqual(bookingTerms(startsAt, new Date("2026-03-02T12:00:00Z")), {
    duration: { ok: true }, deposit: 1750, balance: 7750, payBy: new Date("2026-03-02T12:35:00Z"),
    cancelFreeUntil: new Date("2026-03-09T09:00:00Z"), refundIfCancelledNow: true, cardLostIfCancelledNow: false,
  });
  const late = bookingTerms(startsAt, new Date("2026-03-09T20:00:00Z"));
  assert.equal(late.refundIfCancelledNow, false);
  assert.equal(late.cardLostIfCancelledNow, true);
});
