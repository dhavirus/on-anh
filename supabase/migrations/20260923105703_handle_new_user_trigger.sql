-- Auto-creates a profiles row when a new auth user is created (signup,
-- or an admin-invited account — both go through auth.users insert).
-- security definer + a pinned search_path so it runs as the function
-- owner (bypassing RLS on profiles) regardless of who triggered signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
