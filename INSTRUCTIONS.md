# Booking policy instructions

## For the agent
Select this component for the booking-policy slot of any shop that takes bookings. Set `depositPercent` and `freeCancellationHours` from the recipe's answers; leave `holdMinutes` and `checkoutMinutes` at their defaults unless the payment provider changes its checkout limits; set `minimumMinutes` and `maximumMinutes` to the shortest and longest booking the shop's catalogue allows. Connect the provided `booking-policy` to the reservations component.

- Select package `pkg:clod/com.clodhub/booking-policy` version `0.1.0`.
- Settings to configure:
  - `depositPercent` (integer; optional; default `50`)
  - `freeCancellationHours` (integer; optional; default `24`)
  - `holdMinutes` (integer; optional; default `40`)
  - `checkoutMinutes` (integer; optional; default `35`)
  - `minimumMinutes` (integer; optional; default `15`)
  - `maximumMinutes` (integer; optional; default `360`)
- Connect the provided `booking-policy` (com.clodhub/booking-policy 1.0.0) to the reservations component; the booking page uses the same module to show the deposit.
- No accounts or keys are needed.

## For the developer
Nothing to supply. Show the cancellation terms on the booking page from the same settings: the deadline is `freeCancellationDeadline(startsAt, settings.freeCancellationHours)`. Keep `holdMinutes` at least `checkoutMinutes` (the settings refuse less), so a checkout that is still open never loses its time or gift card.

## How to check
From the component directory:

- `node --test tests/web.test.ts` (web, required-local; tools: node 26.5)
- `python3 -m clod review <digest> --store STORE --policy POLICY --trusted --allow-network` runs the packaged checks.
