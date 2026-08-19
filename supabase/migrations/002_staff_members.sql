-- Staff members table (managed by owner)
create table if not exists staff_members (
  id            uuid primary key default gen_random_uuid(),
  arena_id      uuid references arenas(id) on delete cascade,
  username      text not null,
  display_name  text not null,
  password_hash text not null,
  role          text not null default 'staff' check (role in ('staff','manager','viewer','custom')),
  permissions   jsonb not null default '[]'::jsonb,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  unique(arena_id, username)
);

create index if not exists idx_staff_members_arena on staff_members(arena_id);

-- RLS
alter table staff_members enable row level security;

-- Only owner can manage staff in their arena
create policy "Owner manages staff"
  on staff_members for all
  using (
    exists (
      select 1 from staff_roles
      where staff_roles.arena_id = staff_members.arena_id
        and staff_roles.user_id = auth.uid()
        and staff_roles.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from staff_roles
      where staff_roles.arena_id = staff_members.arena_id
        and staff_roles.user_id = auth.uid()
        and staff_roles.role = 'owner'
    )
  );

-- Staff can read their own record
create policy "Staff reads own record"
  on staff_members for select
  using (id = auth.uid());

-- Trigger to auto-update updated_at
create or replace function update_staff_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger staff_members_updated_at
  before update on staff_members
  for each row execute function update_staff_updated_at();
