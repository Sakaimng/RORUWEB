-- Dominic 14:32: final status thresholds per rolling 12 months (no digit 4): Gohan 5,888 / Tobiko 15,888 / Kama eligible 25,888 (invite only)
update public.loyalty_settings set value = '5888', updated_at = now() where key = 'tier_gohan_hkd';
update public.loyalty_settings set value = '15888', updated_at = now() where key = 'tier_tobiko_hkd';
update public.loyalty_settings set value = '25888', updated_at = now() where key = 'kama_eligible_hkd';
