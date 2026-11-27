import { rawSettings } from "./settings.ts";

export type Money = number;
export type BookingPolicySettings = {
  depositPercent: number;
  freeCancellationHours: number;
  holdMinutes: number;
  checkoutMinutes: number;
  minimumMinutes: number;
  maximumMinutes: number;
};
export type CancellationTerms = { startsAt: Date; now: Date; by: "customer" | "owner"; freeCancellationHours: number };

const MINUTE = 60_000;
const HOUR = 3_600_000;
// The payment provider takes a checkout expiry from 30 minutes to 24 hours ahead; one more minute covers the delay
// before the request arrives.
const CHECKOUT_MINIMUM = 31;
const CHECKOUT_MAXIMUM = 24 * 60;

function whole(value: unknown, name: string, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} is a whole number from ${minimum}${maximum === Number.MAX_SAFE_INTEGER ? "" : ` to ${maximum}`}`);
  }
  return value;
}

function instant(value: unknown, name: string): number {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new RangeError(`${name} is a valid Date`);
  return value.getTime();
}

/**
 * What the customer pays now and at the appointment. The deposit is the percentage of the total, rounded to the minor
 * unit, less the gift card's value; a card worth more than the deposit leaves no deposit, and a card worth more than
 * the total is used whole.
 */
export function depositAndBalance(total: Money, cardValue: Money, depositPercent: number): { deposit: Money; balance: Money } {
  whole(total, "total", 0);
  whole(cardValue, "cardValue", 0);
  whole(depositPercent, "depositPercent", 0, 100);
  const deposit = Math.max(0, Math.round((total * depositPercent) / 100) - cardValue);
  const balance = Math.max(0, total - Math.min(cardValue, total) - deposit);
  return { deposit, balance };
}

/** The last moment a customer may cancel and get the deposit back. */
export function freeCancellationDeadline(startsAt: Date, hours: number): Date {
  return new Date(instant(startsAt, "startsAt") - whole(hours, "hours", 0) * HOUR);
}

/** Whether cancelling now costs nothing: the owner cancels, or the customer cancels more than the free period before the start. */
export function freeCancellation(terms: CancellationTerms): boolean {
  const start = instant(terms.startsAt, "startsAt");
  const now = instant(terms.now, "now");
  return terms.by === "owner" || start - now > whole(terms.freeCancellationHours, "freeCancellationHours", 0) * HOUR;
}

/** Whether cancelling now gives the deposit back: there is a deposit and the cancellation is free. */
export function refundEligible(input: CancellationTerms & { hasDeposit: boolean }): boolean {
  return input.hasDeposit === true && freeCancellation(input);
}

/** Whether cancelling now uses up the gift card, as a late cancellation by the customer keeps the deposit. */
export function cardConsumedByCancellation(input: CancellationTerms & { hasCard: boolean }): boolean {
  return input.hasCard === true && !freeCancellation(input);
}

/** Whether a booking still waiting for payment holds its time and its gift card: it was made less than holdMinutes ago. */
export function holdActive(createdAt: Date, now: Date, holdMinutes: number): boolean {
  return instant(createdAt, "createdAt") > instant(now, "now") - whole(holdMinutes, "holdMinutes", 0) * MINUTE;
}

/** When a payment checkout opened now stops accepting payment: checkoutMinutes ahead, in whole seconds. */
export function checkoutExpiry(now: Date, checkoutMinutes: number): Date {
  const second = Math.floor(instant(now, "now") / 1000) * 1000;
  return new Date(second + whole(checkoutMinutes, "checkoutMinutes", CHECKOUT_MINIMUM, CHECKOUT_MAXIMUM) * MINUTE);
}

/** Whether a booking may last this many minutes. */
export function checkDuration(minutes: unknown, settings: { minimumMinutes: number; maximumMinutes: number }): { ok: true } | { ok: false; code: "INVALID_DURATION" } {
  if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < settings.minimumMinutes || minutes > settings.maximumMinutes) {
    return { ok: false, code: "INVALID_DURATION" };
  }
  return { ok: true };
}

export const DEFAULT_SETTINGS: BookingPolicySettings = {
  depositPercent: 50, freeCancellationHours: 24, holdMinutes: 40, checkoutMinutes: 35, minimumMinutes: 15, maximumMinutes: 360,
};

// A value still in its {{name}} form (the source, before installation renders it) takes the default.
const unrendered = (value: unknown) => typeof value === "string" && /^\{\{[A-Za-z][A-Za-z0-9_.-]*\}\}$/.test(value);

function setting(raw: Record<string, unknown>, name: keyof BookingPolicySettings, minimum: number, maximum: number): number {
  const given = raw[name];
  const value = given === undefined || unrendered(given) ? DEFAULT_SETTINGS[name] : typeof given === "string" && /^\d+$/.test(given) ? Number(given) : given;
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} is a whole number from ${minimum} to ${maximum}`);
  }
  return value;
}

/** Converts and checks raw settings (text as rendered, or numbers); throws RangeError for a value out of range. */
export function settingsFrom(raw: Partial<Record<keyof BookingPolicySettings, unknown>>): BookingPolicySettings {
  const settings: BookingPolicySettings = {
    depositPercent: setting(raw, "depositPercent", 0, 100),
    freeCancellationHours: setting(raw, "freeCancellationHours", 0, 720),
    holdMinutes: setting(raw, "holdMinutes", 1, 2 * CHECKOUT_MAXIMUM),
    checkoutMinutes: setting(raw, "checkoutMinutes", CHECKOUT_MINIMUM, CHECKOUT_MAXIMUM),
    minimumMinutes: setting(raw, "minimumMinutes", 1, 1440),
    maximumMinutes: setting(raw, "maximumMinutes", 1, 1440),
  };
  // A checkout still open must keep holding its time and gift card.
  if (settings.holdMinutes < settings.checkoutMinutes) throw new RangeError("holdMinutes is at least checkoutMinutes");
  if (settings.maximumMinutes < settings.minimumMinutes) throw new RangeError("maximumMinutes is at least minimumMinutes");
  return settings;
}

export const installedSettings = (): BookingPolicySettings => settingsFrom(rawSettings);
