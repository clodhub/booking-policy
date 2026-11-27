// The entry module of booking-policy: everything code outside the component may use.
export {
  DEFAULT_SETTINGS, cardConsumedByCancellation, checkDuration, checkoutExpiry, depositAndBalance, freeCancellation, freeCancellationDeadline,
  holdActive, installedSettings, refundEligible, settingsFrom,
} from "./policy.ts";
export type { BookingPolicySettings, CancellationTerms, Money } from "./policy.ts";
