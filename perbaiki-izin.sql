-- DOMSTORE — setup database lengkap. Aman dijalankan berulang kali.
-- Jalankan di Supabase → SQL Editor → New query → Run.
-- Email admin di bawah harus sama dengan email user di Authentication → Users.

create or replace function public.is_admin() returns boolean
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) = lower('makbarooo2009@gmail.com') $$;

-- Produk (dibaca publik)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  cat text not null,
  name text not null,
  description text not null default '',
  price bigint check (price is null or price >= 0),
  status text check (status in ('Tersedia','Terbatas','Habis')),
  image text not null default '',
  info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Pengaturan (nomor WhatsApp + teks pesan otomatis)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  wa_number text not null default '628993383985'
);
alter table public.settings add column if not exists wa_templates jsonb not null default '{}'::jsonb;
insert into public.settings (id) values (1) on conflict do nothing;

-- Data privat (hanya admin): harga asli/modal, penjualan kasir, biaya operasional
create table if not exists public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost bigint not null check (cost >= 0)
);
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer text not null default '',
  phone text not null default '',
  method text not null default 'Tunai',
  note text not null default '',
  items jsonb not null default '[]'::jsonb,
  total bigint not null default 0,
  cost_total bigint not null default 0
);
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  label text not null,
  amount bigint not null check (amount >= 0)
);

alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.product_costs enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;

insert into storage.buckets (id, name, public) values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "produk dibaca publik" on public.products;
drop policy if exists "produk dikelola admin" on public.products;
drop policy if exists "pengaturan dibaca publik" on public.settings;
drop policy if exists "pengaturan dikelola admin" on public.settings;
drop policy if exists "modal hanya admin" on public.product_costs;
drop policy if exists "penjualan hanya admin" on public.sales;
drop policy if exists "biaya hanya admin" on public.expenses;
drop policy if exists "gambar dibaca publik" on storage.objects;
drop policy if exists "gambar diunggah admin" on storage.objects;
drop policy if exists "gambar diubah admin" on storage.objects;
drop policy if exists "gambar dihapus admin" on storage.objects;

create policy "produk dibaca publik" on public.products for select using (true);
create policy "produk dikelola admin" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "pengaturan dibaca publik" on public.settings for select using (true);
create policy "pengaturan dikelola admin" on public.settings for all using (public.is_admin()) with check (public.is_admin());
create policy "modal hanya admin" on public.product_costs for all using (public.is_admin()) with check (public.is_admin());
create policy "penjualan hanya admin" on public.sales for all using (public.is_admin()) with check (public.is_admin());
create policy "biaya hanya admin" on public.expenses for all using (public.is_admin()) with check (public.is_admin());
create policy "gambar dibaca publik" on storage.objects for select using (bucket_id = 'products');
create policy "gambar diunggah admin" on storage.objects for insert with check (bucket_id = 'products' and public.is_admin());
create policy "gambar diubah admin" on storage.objects for update using (bucket_id = 'products' and public.is_admin());
create policy "gambar dihapus admin" on storage.objects for delete using (bucket_id = 'products' and public.is_admin());
