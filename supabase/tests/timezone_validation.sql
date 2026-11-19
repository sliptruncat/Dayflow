-- Run only against a local or isolated Supabase database.
begin;

do $$
declare
  valid_zone text;
  invalid_zone text;
begin
  foreach valid_zone in array array['Europe/Berlin', 'Europe/Moscow', 'Asia/Tokyo', 'UTC']
  loop
    if not public.is_valid_iana_timezone(valid_zone) then
      raise exception 'Expected valid IANA timezone: %', valid_zone;
    end if;
  end loop;

  foreach invalid_zone in array array['Invalid/Timezone', '', 'arbitrary text']
  loop
    if public.is_valid_iana_timezone(invalid_zone) then
      raise exception 'Expected invalid IANA timezone: %', invalid_zone;
    end if;
  end loop;
end;
$$;

rollback;
