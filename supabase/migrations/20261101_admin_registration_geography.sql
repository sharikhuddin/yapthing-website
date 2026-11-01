create or replace function public.yap_admin_registration_geography()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare output jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  select jsonb_build_object(
    'total', count(*),
    'known', count(*) filter (where country_code is not null),
    'unknown', count(*) filter (where country_code is null),
    'last_30_days', count(*) filter (where created_at >= now() - interval '30 days'),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object('code', country_code, 'total', total, 'last_30_days', recent) order by total desc, country_code)
      from (
        select country_code, count(*) as total,
          count(*) filter (where created_at >= now() - interval '30 days') as recent
        from (
          select created_at,
            case when raw_user_meta_data->>'registration_country' ~ '^[A-Z]{2}$'
              then raw_user_meta_data->>'registration_country' else null end as country_code
          from auth.users
        ) src where country_code is not null group by country_code
      ) groupings
    ), '[]'::jsonb),
    'by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', month, 'known', known_count, 'unknown', unknown_count) order by month desc)
      from (
        select to_char(date_trunc('month',created_at), 'YYYY-MM') as month,
          count(*) filter (where raw_user_meta_data->>'registration_country' ~ '^[A-Z]{2}$') as known_count,
          count(*) filter (where coalesce(raw_user_meta_data->>'registration_country','') !~ '^[A-Z]{2}$') as unknown_count
        from auth.users where created_at >= now()-interval '12 months'
        group by 1 order by month desc limit 12
      ) monthly
    ), '[]'::jsonb)
  ) into output
  from (select created_at,
    case when raw_user_meta_data->>'registration_country' ~ '^[A-Z]{2}$'
      then raw_user_meta_data->>'registration_country' else null end as country_code
    from auth.users) counts;
  return output;
end;
$$;
revoke all on function public.yap_admin_registration_geography() from PUBLIC, anon, authenticated;
grant execute on function public.yap_admin_registration_geography() to service_role;
comment on function public.yap_admin_registration_geography is 'Admin-only aggregate of optional, self-reported signup countries. No IP addresses. Unknown includes missing countries.';
