-- f40 (Oct 19 2026, task 6caf0a53): token renamed ROLL -> $RORU (EN), 卷幣 -> RORU幣 (繁中; 简中 shows RORU币 by the app's character conversion).
-- Copy-only: the same display-text rows f39 changed. Old (ROLL-era) text saved first in loyalty_copy_backup_f40 (new table); loyalty_copy_backup_f39 kept as is.
create table if not exists public.loyalty_copy_backup_f40 (tbl text, id text, col text, old_value text, new_value text, saved_at timestamptz default now());
alter table public.loyalty_copy_backup_f40 enable row level security;
insert into public.loyalty_copy_backup_f40 (tbl, id, col, old_value, new_value)
select v.* from (values
  ('loyalty_perks','nori_points','name_en','{x}× ROLL on every HK$1','{x}× $RORU on every HK$1'),
  ('loyalty_perks','nori_points','name_zh','每 HK$1 賺 {x}× 卷幣','每 HK$1 賺 {x}× RORU幣'),
  ('loyalty_perks','gohan_points','name_en','{x}× ROLL on every HK$1','{x}× $RORU on every HK$1'),
  ('loyalty_perks','gohan_points','name_zh','每 HK$1 賺 {x}× 卷幣','每 HK$1 賺 {x}× RORU幣'),
  ('loyalty_perks','tobiko_points','name_en','{x}× ROLL on every HK$1','{x}× $RORU on every HK$1'),
  ('loyalty_perks','tobiko_points','name_zh','每 HK$1 賺 {x}× 卷幣','每 HK$1 賺 {x}× RORU幣'),
  ('loyalty_perks','kama_points','name_en','{x}× ROLL on every HK$1','{x}× $RORU on every HK$1'),
  ('loyalty_perks','kama_points','name_zh','每 HK$1 賺 {x}× 卷幣','每 HK$1 賺 {x}× RORU幣'),
  ('loyalty_perks','nori_gold','detail_en','About 1 in 20 receipts turns gold: 2× ROLL on it + a free highball','About 1 in 20 receipts turns gold: 2× $RORU on it + a free highball'),
  ('loyalty_perks','nori_gold','detail_zh','約每 20 張收據有 1 張變金色：該張雙倍卷幣 + 免費 Highball 一杯','約每 20 張收據有 1 張變金色：該張雙倍 RORU幣 + 免費 Highball 一杯'),
  ('loyalty_perks','nori_friend','detail_en','You both get bonus ROLL','You both get bonus $RORU'),
  ('loyalty_perks','nori_friend','detail_zh','你們都有額外卷幣','你們都有額外 RORU幣'),
  ('loyalty_features','bring_friend','detail_en','Bring a friend — you both get bonus ROLL.','Bring a friend — you both get bonus $RORU.'),
  ('loyalty_features','bring_friend','detail_zh','帶朋友來 — 你們都可獲額外卷幣。','帶朋友來 — 你們都可獲額外 RORU幣。'),
  ('loyalty_features','roru_day','detail_en','One night a month: the secret drop night, with double ROLL for members.','One night a month: the secret drop night, with double $RORU for members.'),
  ('loyalty_features','roru_day','detail_zh','每月一晚：隱藏菜式發佈夜，會員雙倍卷幣。','每月一晚：隱藏菜式發佈夜，會員雙倍 RORU幣。'),
  ('loyalty_features','gold_receipt','detail_en','Random scans turn gold: double ROLL + a free highball.','Random scans turn gold: double $RORU + a free highball.'),
  ('loyalty_features','gold_receipt','detail_zh','隨機收據變金色：雙倍卷幣 + 免費 Highball 一杯。','隨機收據變金色：雙倍 RORU幣 + 免費 Highball 一杯。'),
  ('loyalty_scratch_prizes','6','name_en','+88 bonus ROLL','+88 bonus $RORU'),
  ('loyalty_scratch_prizes','6','name_zh','88 卷幣','88 RORU幣'),
  ('loyalty_scratch_prizes','6','line_en','+88 bonus ROLL, straight to your card.','+88 bonus $RORU, straight to your card.'),
  ('loyalty_scratch_prizes','6','line_zh','即送 88 卷幣到你的卡。','即送 88 RORU幣到你的卡。')
) v(tbl, id, col, old_value, new_value)
where not exists (select 1 from public.loyalty_copy_backup_f40);
update public.loyalty_perks set name_en = '{x}× $RORU on every HK$1' where key::text = 'nori_points' and name_en = '{x}× ROLL on every HK$1';
update public.loyalty_perks set name_zh = '每 HK$1 賺 {x}× RORU幣' where key::text = 'nori_points' and name_zh = '每 HK$1 賺 {x}× 卷幣';
update public.loyalty_perks set name_en = '{x}× $RORU on every HK$1' where key::text = 'gohan_points' and name_en = '{x}× ROLL on every HK$1';
update public.loyalty_perks set name_zh = '每 HK$1 賺 {x}× RORU幣' where key::text = 'gohan_points' and name_zh = '每 HK$1 賺 {x}× 卷幣';
update public.loyalty_perks set name_en = '{x}× $RORU on every HK$1' where key::text = 'tobiko_points' and name_en = '{x}× ROLL on every HK$1';
update public.loyalty_perks set name_zh = '每 HK$1 賺 {x}× RORU幣' where key::text = 'tobiko_points' and name_zh = '每 HK$1 賺 {x}× 卷幣';
update public.loyalty_perks set name_en = '{x}× $RORU on every HK$1' where key::text = 'kama_points' and name_en = '{x}× ROLL on every HK$1';
update public.loyalty_perks set name_zh = '每 HK$1 賺 {x}× RORU幣' where key::text = 'kama_points' and name_zh = '每 HK$1 賺 {x}× 卷幣';
update public.loyalty_perks set detail_en = 'About 1 in 20 receipts turns gold: 2× $RORU on it + a free highball' where key::text = 'nori_gold' and detail_en = 'About 1 in 20 receipts turns gold: 2× ROLL on it + a free highball';
update public.loyalty_perks set detail_zh = '約每 20 張收據有 1 張變金色：該張雙倍 RORU幣 + 免費 Highball 一杯' where key::text = 'nori_gold' and detail_zh = '約每 20 張收據有 1 張變金色：該張雙倍卷幣 + 免費 Highball 一杯';
update public.loyalty_perks set detail_en = 'You both get bonus $RORU' where key::text = 'nori_friend' and detail_en = 'You both get bonus ROLL';
update public.loyalty_perks set detail_zh = '你們都有額外 RORU幣' where key::text = 'nori_friend' and detail_zh = '你們都有額外卷幣';
update public.loyalty_features set detail_en = 'Bring a friend — you both get bonus $RORU.' where key::text = 'bring_friend' and detail_en = 'Bring a friend — you both get bonus ROLL.';
update public.loyalty_features set detail_zh = '帶朋友來 — 你們都可獲額外 RORU幣。' where key::text = 'bring_friend' and detail_zh = '帶朋友來 — 你們都可獲額外卷幣。';
update public.loyalty_features set detail_en = 'One night a month: the secret drop night, with double $RORU for members.' where key::text = 'roru_day' and detail_en = 'One night a month: the secret drop night, with double ROLL for members.';
update public.loyalty_features set detail_zh = '每月一晚：隱藏菜式發佈夜，會員雙倍 RORU幣。' where key::text = 'roru_day' and detail_zh = '每月一晚：隱藏菜式發佈夜，會員雙倍卷幣。';
update public.loyalty_features set detail_en = 'Random scans turn gold: double $RORU + a free highball.' where key::text = 'gold_receipt' and detail_en = 'Random scans turn gold: double ROLL + a free highball.';
update public.loyalty_features set detail_zh = '隨機收據變金色：雙倍 RORU幣 + 免費 Highball 一杯。' where key::text = 'gold_receipt' and detail_zh = '隨機收據變金色：雙倍卷幣 + 免費 Highball 一杯。';
update public.loyalty_scratch_prizes set name_en = '+88 bonus $RORU' where id::text = '6' and name_en = '+88 bonus ROLL';
update public.loyalty_scratch_prizes set name_zh = '88 RORU幣' where id::text = '6' and name_zh = '88 卷幣';
update public.loyalty_scratch_prizes set line_en = '+88 bonus $RORU, straight to your card.' where id::text = '6' and line_en = '+88 bonus ROLL, straight to your card.';
update public.loyalty_scratch_prizes set line_zh = '即送 88 RORU幣到你的卡。' where id::text = '6' and line_zh = '即送 88 卷幣到你的卡。';
