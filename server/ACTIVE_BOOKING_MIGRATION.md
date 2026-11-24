# Active booking uniqueness migration

This migration enforces at most one `pending` or `approved` booking for each property/tenant pair.

## Why it is required

A pre-insert duplicate check is not concurrency-safe: two requests can both pass the check before either insert commits. The API now writes a deterministic `activeBookingKey` and relies on a MongoDB unique sparse index to serialize those competing inserts. A duplicate-key response is translated to HTTP 409.

Rejected and cancelled bookings release the key. Approved bookings retain it, so a second active request remains blocked.

## Deployment procedure

**Schedule a brief maintenance window. Stop every API instance before applying the migration.** This prevents an older application instance from creating a booking without the key while the backfill is running.

From the `server/` directory:

1. Set `MONGO_URI` to the target database.
2. Run a read-only preflight:

   ```bash
   npm run migrate:active-booking-key
   ```

3. If the preflight reports duplicate active property/tenant pairs, stop and resolve them manually. The script deliberately does not delete or reject customer bookings automatically.
4. With all API instances still stopped, apply the backfill and unique index:

   ```bash
   npm run migrate:active-booking-key -- --apply
   ```

5. Start the API. Startup verifies that the unique sparse index exists and that every active booking has its key. It refuses to listen if migration is incomplete.

The apply operation is repeatable: it clears the derived key field, backfills it from active bookings, then ensures the named unique index. It does not change booking statuses or delete booking records.

## Verification

After applying, confirm the index named `uniq_active_booking_per_tenant_property` is unique and sparse, and that no `pending` or `approved` booking is missing `activeBookingKey`.

A database-backed concurrency test should be run against the target MongoDB deployment before enabling production traffic. The repository CI tests cover key generation, model index declaration, and the startup migration gate, but do not substitute for testing the live database index.
