import { cardConsumedByCancellation, checkDuration, checkoutExpiry, depositAndBalance, freeCancellationDeadline, refundEligible, type BookingPolicySettings } from "../implementation/web/index.ts";

// Example Studio takes a 50% deposit and refunds it up to a day before the appointment.
const settings: BookingPolicySettings = { depositPercent: 50, freeCancellationHours: 24, holdMinutes: 40, checkoutMinutes: 35, minimumMinutes: 15, maximumMinutes: 360 };

// A Relaxing Massage (60 min, 7500) and a Deep Facial (60 min, 8000), partly paid with a gift card worth 6000.
export function bookingTerms(startsAt: Date, now: Date) {
  const duration = checkDuration(60 + 5 + 60, settings);
  const { deposit, balance } = depositAndBalance(7500 + 8000, 6000, settings.depositPercent);
  const terms = { startsAt, now, by: "customer" as const, freeCancellationHours: settings.freeCancellationHours };
  return {
    duration,
    deposit,
    balance,
    payBy: checkoutExpiry(now, settings.checkoutMinutes),
    cancelFreeUntil: freeCancellationDeadline(startsAt, settings.freeCancellationHours),
    refundIfCancelledNow: refundEligible({ ...terms, hasDeposit: deposit > 0 }),
    cardLostIfCancelledNow: cardConsumedByCancellation({ ...terms, hasCard: true }),
  };
}
