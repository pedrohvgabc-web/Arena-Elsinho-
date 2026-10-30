alter table public.bookings add column if not exists group_code text;
update public.bookings set group_code = booking_code where group_code is null;
alter table public.bookings alter column group_code set not null;
create index if not exists bookings_group_code_idx on public.bookings (group_code);