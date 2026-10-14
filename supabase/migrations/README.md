# Roru Family loyalty — Supabase migrations

Project: Dominic's Supabase org "Rorubaru", project "Roru Loyalty" (ref gpudggbdwghzsanyvvgt, Sydney).
Applied in order on 2026-10-14 (dark preview). All additive: `loyalty_members` and `orders` are never dropped or rewritten.

1. `20261014050000_roru_family_v1.sql` — settings, shops, members' extra columns, rewards, visits, redemptions, staff (hashed PINs), sessions, OTP, RLS on everything, SECURITY DEFINER RPC functions (guest / staff / owner).
2. `20261014053000_demo_mode.sql` — preview-only `p_demo` on `staff_add_roll` (v1a visits mechanic; no longer used by the UI).
3. `20261014054000_pin_lengths.sql` — staff PIN = 4 digits, owner PIN = 6 digits.
4. `20261014060000_receipt_points.sql` — v1b: spend points via receipts (`loyalty_receipts`, approve queue, points ladder, tiers by lifetime spend), new `lf_member_json`, staff/owner functions.

Access model: the public (anon/publishable) key can only call the granted `family_*`, `staff_*`, `owner_*` functions; no table is readable directly (RLS enabled, no policies). Staff functions need a staff session token from `staff_login(pin)`; owner functions need an owner-role session.
Switching on real SMS: set `otp_test_mode=false` in `loyalty_settings` and wire a sender (Edge Function or DB webhook) that delivers the code generated in `family_request_code` — nothing is wired in the preview, so no SMS is sent.
