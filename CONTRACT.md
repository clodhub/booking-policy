# Booking policy component

## Purpose and facilities
The rules a shop applies around a booking, kept apart from the booking flow so the booking page shows the same numbers the server charges. A booking pays a deposit online (`depositPercent` of the total, less any gift card) and the balance at the appointment. A customer who cancels more than `freeCancellationHours` before the start gets the deposit back; the owner's cancellation is always free; a late cancellation by the customer keeps the deposit and uses up a gift card. A booking waiting for payment holds its time and its gift card for `holdMinutes`, a payment checkout expires after `checkoutMinutes`, and a booking lasts from `minimumMinutes` to `maximumMinutes`.

Facilities: `booking-policy` (Deposit and balance, free cancellation and refunds, gift card use on late cancellation, payment holds, checkout expiry and booking lengths).

## User inputs
`depositPercent` (0 takes no deposit and confirms at once, 100 takes the whole price online), `freeCancellationHours`, `holdMinutes` (at least `checkoutMinutes`), `checkoutMinutes` (31 to 1440: the payment provider accepts 30 minutes to 24 hours), `minimumMinutes` and `maximumMinutes` for the length of one booking. The defaults are the source shop's terms.

- `depositPercent` (integer; optional; default `50`)
- `freeCancellationHours` (integer; optional; default `24`)
- `holdMinutes` (integer; optional; default `40`)
- `checkoutMinutes` (integer; optional; default `35`)
- `minimumMinutes` (integer; optional; default `15`)
- `maximumMinutes` (integer; optional; default `360`)

## Artefacts and dependencies
`component.json` maps every `implementation/` source into `components/booking-policy/`:

- `implementation/server/index.ts` -> `components/booking-policy/server/index.ts`
- `implementation/web/index.ts` -> `components/booking-policy/web/index.ts`
- `implementation/web/policy.ts` -> `components/booking-policy/web/policy.ts`
- `implementation/web/settings.ts` -> `components/booking-policy/web/settings.ts`

Dependencies: none.
`tools.lock.json` pins verification tools: node 26.5. Licence: `Apache-2.0` (`LICENCE`, `NOTICE`).

## Provided interfaces
- `interfaces/booking-policy.json` defines `booking-policy` (com.clodhub/booking-policy) version 1.0.0.

## Required interfaces
None.

## Integration
Pure functions on the web and the server (`web/index.ts`, `server/index.ts`). The booking page calls `depositAndBalance` to show what is paid now; the reservations component calls the same functions with the same settings when it creates the checkout (`checkoutExpiry`), counts the bookings that hold a gift card (`holdActive`), previews a cancellation (`refundEligible`, `freeCancellationDeadline`) and cancels (`refundEligible` for the deposit, `cardConsumedByCancellation` for the gift card). Amounts are integers in minor units.

## Visual definition and connected examples
`visual/definition.json` maps its ports to the provided and required interfaces. `visual/examples/connected.json` connects the component to an illustrative application consumer. Both image formats and a text description are retained under `visual/output/`.

## Infrastructure
No service, account or stored data.

## Verification
`tests/web.test.ts` checks the settings template and its limits, the deposit and balance against the source's own `giftCardAmounts` run on 18 cases, other percentages, the strict deadline (exactly the free period before the start is late), owner and customer cancellations with and without a deposit, a card-only booking keeping its card when cancelled early, the hold boundary, the checkout expiry in whole seconds with the provider's limits, durations, and the example. The class suite (`classes/booking-policy-class/check.mjs`) checks the same contract against any implementation.

- `node --test tests/web.test.ts` (web, required-local; tools: node 26.5)

## Scenarios and presentation
Example Studio books a Relaxing Massage and a Deep Facial (15500) paid partly with a 6000 gift card: the customer pays a 1750 deposit online and 7750 at the studio. Cancelling two days ahead refunds the deposit and keeps the card; cancelling the evening before keeps the deposit and uses up the card. A shop that takes no deposits sets `depositPercent` to 0.

## Updates and removal
Patch updates replace the files only; the component keeps no data. Changing a setting changes the terms of new bookings only if the application stores what it charged.
