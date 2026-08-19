-- Booking attachments table
create table if not exists booking_attachments (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  uploaded_by_role text not null check (uploaded_by_role in ('customer','staff','manager','owner')),
  uploaded_by_user uuid,
  file_path     text not null,
  file_type     text not null check (file_type in ('image','video')),
  mime_type     text,
  size_bytes    int,
  created_at    timestamptz not null default now()
);

create index if not exists idx_booking_attachments_booking on booking_attachments(booking_id);

-- RLS
alter table booking_attachments enable row level security;

-- Customers: can insert attachments on their own bookings
create policy "Customers insert own booking attachments"
  on booking_attachments for insert
  with check (
    exists (
      select 1 from bookings
      where bookings.id = booking_attachments.booking_id
        and bookings.customer_id = auth.uid()
    )
  );

-- Customers: can view attachments on their own bookings
create policy "Customers select own booking attachments"
  on booking_attachments for select
  using (
    exists (
      select 1 from bookings
      where bookings.id = booking_attachments.booking_id
        and bookings.customer_id = auth.uid()
    )
  );

-- Staff/manager/owner: can insert attachments on their arena's bookings
create policy "Staff insert arena booking attachments"
  on booking_attachments for insert
  with check (
    exists (
      select 1 from bookings
        join staff_roles on staff_roles.arena_id = bookings.arena_id
      where bookings.id = booking_attachments.booking_id
        and staff_roles.user_id = auth.uid()
        and staff_roles.role in ('staff','manager','owner')
    )
  );

-- Staff/manager/owner: can view attachments on their arena's bookings
create policy "Staff select arena booking attachments"
  on booking_attachments for select
  using (
    exists (
      select 1 from bookings
        join staff_roles on staff_roles.arena_id = bookings.arena_id
      where bookings.id = booking_attachments.booking_id
        and staff_roles.user_id = auth.uid()
        and staff_roles.role in ('staff','manager','owner')
    )
  );

-- Storage buckets (run these in Supabase SQL editor or create via dashboard)
-- insert into storage.buckets (id, name, public) values ('booking-images', 'booking-images', false);
-- insert into storage.buckets (id, name, public) values ('booking-videos', 'booking-videos', false);

-- Storage policies for booking-images:
-- All authenticated users can upload to booking-images
-- create policy "Auth users upload images" on storage.objects for insert
--   with check (bucket_id = 'booking-images' and auth.role() = 'authenticated');
-- create policy "Auth users read images" on storage.objects for select
--   using (bucket_id = 'booking-images' and auth.role() = 'authenticated');

-- Storage policies for booking-videos:
-- Only staff/manager/owner can upload to booking-videos
-- create policy "Staff upload videos" on storage.objects for insert
--   with check (
--     bucket_id = 'booking-videos'
--     and exists (
--       select 1 from staff_roles
--       where staff_roles.user_id = auth.uid()
--         and staff_roles.role in ('staff','manager','owner')
--     )
--   );
-- create policy "Staff read videos" on storage.objects for select
--   using (
--     bucket_id = 'booking-videos'
--     and exists (
--       select 1 from staff_roles
--       where staff_roles.user_id = auth.uid()
--         and staff_roles.role in ('staff','manager','owner')
--     )
--   );
