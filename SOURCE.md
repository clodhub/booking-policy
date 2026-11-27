# Source mapping

Reference revision: `219d7dc979278f850fe0efd83c5e11eee26c3217` of `george-mcintyre/totalsculpt` (the totalsculpt.com web monorepo). Paths below are relative to that repository's root.

- `implementation/web/policy.ts` <-
  - `depositAndBalance`: `web/apps/beauty-center/src/lib/gift-card-rules.ts:39-47` (giftCardAmounts), `web/apps/beauty-center/src/app/api/reserve/route.ts:248-258` (total and card value), `web/apps/beauty-center/src/lib/reservation-fulfilment.ts:247-252` (the balance after payment). The 50% deposit becomes the `depositPercent` setting; at 50 the results equal the source's own giftCardAmounts on 18 cases (tested).
  - `freeCancellationDeadline`, `freeCancellation`, `refundEligible`, `cardConsumedByCancellation`: `web/apps/beauty-center/src/lib/reservation-fulfilment.ts:12,75-77`, `web/apps/beauty-center/src/app/api/reservations/cancel/route.ts:8,50-77,207-216`. The 24 hours become the `freeCancellationHours` setting. `freeCancellation` says whether a cancellation is in time, `refundEligible` whether it also has a deposit to refund (the cancel route's tests at lines 54, 58 and 214-215), and `cardConsumedByCancellation` uses the first, so a booking the card paid in full keeps its card when cancelled in time.
  - `holdActive`: `web/apps/beauty-center/src/app/api/reserve/route.ts:23,195-203` (a checkout younger than 40 minutes holds the gift card); the 40 minutes become `holdMinutes`.
  - `checkoutExpiry`: `web/apps/beauty-center/src/app/api/reserve/route.ts:347` (35 minutes in whole seconds; the payment provider's minimum is 30); the 35 minutes become `checkoutMinutes`, from 31 to 1440 minutes (Stripe's limits for `expires_at`: https://docs.stripe.com/api/checkout/sessions/create).
  - `checkDuration`: `web/apps/beauty-center/src/app/api/availability/route.ts:29-32` (15 to 360 minutes); the bounds become `minimumMinutes` and `maximumMinutes`, and a duration that is not a whole number is refused.
  - Generalised: euros become minor units; times are passed in; settings are checked together (`holdMinutes` at least `checkoutMinutes`, `maximumMinutes` at least `minimumMinutes`).
  - Left behind: the reservation documents, the refunds and the emails these rules decide (reservations, payments, mail).
- `implementation/web/settings.ts`: new; the settings template clod renders at install.
- `implementation/web/index.ts`, `implementation/server/index.ts`: new; the entry modules (the server one re-exports the web one).
- `tests/fixtures/source-amounts.ts`: generated; the results of the source's own giftCardAmounts, run on a copy of `gift-card-rules.ts` outside the package.
- `tests/web.test.ts`, `tests/render.ts`, `examples/consumer.ts`: new (`tests/render.ts` from memory-records).
