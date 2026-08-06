-- ============================================================
-- LORHIL AC ONLINE V36 - SETUP DATABASE LENGKAP
-- Jalankan satu kali melalui Supabase SQL Editor.
-- Aman untuk database lama: invoice dan relasi nama teknisi dipertahankan.
-- ============================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null,
  work_date date not null,
  work_time time not null,
  customer_name text not null,
  customer_phone text,
  customer_address text,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  paid numeric(14,2) not null default 0 check (paid >= 0),
  balance numeric(14,2) not null default 0 check (balance >= 0),
  status text not null default 'Belum Lunas' check (status in ('Belum Lunas','DP','Lunas')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, invoice_number)
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) generated always as (quantity * unit_price) stored,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  store_name text not null default 'LORHIL AC',
  phone text,
  address text,
  payment_info text,
  footer_note text,
  signer_name text default 'Hendri',
  signer_role text default 'Pemilik LORHIL AC',
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_sequences (
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence_year integer not null,
  last_number integer not null default 0,
  primary key(user_id, sequence_year)
);

create table if not exists public.technicians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_technicians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  technician_id uuid not null references public.technicians(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(invoice_id, technician_id)
);

-- Pastikan kolom inti tersedia pada database hasil pembaruan versi lama.
alter table public.technicians add column if not exists phone text;
alter table public.technicians add column if not exists is_active boolean not null default true;
alter table public.technicians add column if not exists created_at timestamptz not null default now();
alter table public.technicians add column if not exists updated_at timestamptz not null default now();
alter table public.invoice_technicians add column if not exists created_at timestamptz not null default now();
alter table public.invoice_technicians add column if not exists updated_at timestamptz not null default now();

-- Hapus mekanisme insentif lama, tanpa menghapus hubungan nama teknisi dengan nota.
drop trigger if exists invoices_sync_technician_status on public.invoices;
drop trigger if exists protect_paid_incentive_update on public.invoice_technicians;
drop trigger if exists protect_paid_incentive_delete on public.invoice_technicians;
drop trigger if exists item_incentives_set_updated_at on public.invoice_item_incentives;
drop function if exists public.sync_invoice_technician_status() cascade;
drop function if exists public.protect_paid_incentive() cascade;
drop table if exists public.invoice_item_incentives cascade;
drop index if exists public.invoice_technicians_status_idx;
alter table public.invoice_technicians drop column if exists share_amount;
alter table public.invoice_technicians drop column if exists status;
alter table public.invoice_technicians drop column if exists paid_at;
alter table public.invoice_technicians drop column if exists payment_note;

create index if not exists invoices_user_date_idx on public.invoices(user_id, work_date desc);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id);
create index if not exists technicians_user_name_idx on public.technicians(user_id, name);
create index if not exists invoice_technicians_user_idx on public.invoice_technicians(user_id);
create index if not exists invoice_technicians_invoice_idx on public.invoice_technicians(invoice_id);
create index if not exists invoice_technicians_technician_idx on public.invoice_technicians(technician_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists settings_set_updated_at on public.store_settings;
create trigger settings_set_updated_at before update on public.store_settings
for each row execute function public.set_updated_at();

drop trigger if exists technicians_set_updated_at on public.technicians;
create trigger technicians_set_updated_at before update on public.technicians
for each row execute function public.set_updated_at();

drop trigger if exists invoice_technicians_set_updated_at on public.invoice_technicians;
create trigger invoice_technicians_set_updated_at before update on public.invoice_technicians
for each row execute function public.set_updated_at();

drop function if exists public.set_incentive_updated_at();

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.store_settings enable row level security;
alter table public.invoice_sequences enable row level security;
alter table public.technicians enable row level security;
alter table public.invoice_technicians enable row level security;

-- Kebijakan invoice.
drop policy if exists "invoices_select_own" on public.invoices;
drop policy if exists "invoices_insert_own" on public.invoices;
drop policy if exists "invoices_update_own" on public.invoices;
drop policy if exists "invoices_delete_own" on public.invoices;
create policy "invoices_select_own" on public.invoices for select to authenticated using (user_id=auth.uid());
create policy "invoices_insert_own" on public.invoices for insert to authenticated with check (user_id=auth.uid());
create policy "invoices_update_own" on public.invoices for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "invoices_delete_own" on public.invoices for delete to authenticated using (user_id=auth.uid());

-- Kebijakan item invoice.
drop policy if exists "items_select_own" on public.invoice_items;
drop policy if exists "items_insert_own" on public.invoice_items;
drop policy if exists "items_update_own" on public.invoice_items;
drop policy if exists "items_delete_own" on public.invoice_items;
create policy "items_select_own" on public.invoice_items for select to authenticated using (user_id=auth.uid());
create policy "items_insert_own" on public.invoice_items for insert to authenticated
with check (user_id=auth.uid() and exists(select 1 from public.invoices i where i.id=invoice_id and i.user_id=auth.uid()));
create policy "items_update_own" on public.invoice_items for update to authenticated
using (user_id=auth.uid())
with check (user_id=auth.uid() and exists(select 1 from public.invoices i where i.id=invoice_id and i.user_id=auth.uid()));
create policy "items_delete_own" on public.invoice_items for delete to authenticated using (user_id=auth.uid());

-- Kebijakan pengaturan.
drop policy if exists "settings_select_own" on public.store_settings;
drop policy if exists "settings_insert_own" on public.store_settings;
drop policy if exists "settings_update_own" on public.store_settings;
create policy "settings_select_own" on public.store_settings for select to authenticated using (user_id=auth.uid());
create policy "settings_insert_own" on public.store_settings for insert to authenticated with check (user_id=auth.uid());
create policy "settings_update_own" on public.store_settings for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Kebijakan teknisi.
drop policy if exists "technicians_select_own" on public.technicians;
drop policy if exists "technicians_insert_own" on public.technicians;
drop policy if exists "technicians_update_own" on public.technicians;
drop policy if exists "technicians_delete_own" on public.technicians;
create policy "technicians_select_own" on public.technicians for select to authenticated using (user_id=auth.uid());
create policy "technicians_insert_own" on public.technicians for insert to authenticated with check (user_id=auth.uid());
create policy "technicians_update_own" on public.technicians for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "technicians_delete_own" on public.technicians for delete to authenticated using (user_id=auth.uid());

-- Kebijakan hubungan nota dan teknisi.
drop policy if exists "invoice_technicians_select_own" on public.invoice_technicians;
drop policy if exists "invoice_technicians_insert_own" on public.invoice_technicians;
drop policy if exists "invoice_technicians_update_own" on public.invoice_technicians;
drop policy if exists "invoice_technicians_delete_own" on public.invoice_technicians;
create policy "invoice_technicians_select_own" on public.invoice_technicians for select to authenticated using (user_id=auth.uid());
create policy "invoice_technicians_insert_own" on public.invoice_technicians for insert to authenticated
with check (
  user_id=auth.uid()
  and exists(select 1 from public.invoices i where i.id=invoice_id and i.user_id=auth.uid())
  and exists(select 1 from public.technicians t where t.id=technician_id and t.user_id=auth.uid())
);
create policy "invoice_technicians_update_own" on public.invoice_technicians for update to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "invoice_technicians_delete_own" on public.invoice_technicians for delete to authenticated using (user_id=auth.uid());

revoke all on public.invoice_sequences from anon, authenticated;

grant select,insert,update,delete on public.invoices to authenticated;
grant select,insert,update,delete on public.invoice_items to authenticated;
grant select,insert,update on public.store_settings to authenticated;
grant select,insert,update,delete on public.technicians to authenticated;
grant select,insert,update,delete on public.invoice_technicians to authenticated;

create or replace function public.next_invoice_number(p_year integer)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_number integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  insert into public.invoice_sequences(user_id,sequence_year,last_number)
  values(v_user,p_year,1)
  on conflict(user_id,sequence_year)
  do update set last_number=public.invoice_sequences.last_number+1
  returning last_number into v_number;

  return 'LAC-'||p_year::text||'-'||lpad(v_number::text,4,'0');
end;
$$;

revoke all on function public.next_invoice_number(integer) from public,anon;
grant execute on function public.next_invoice_number(integer) to authenticated;

create or replace function public.save_invoice(
  p_invoice_id uuid,
  p_work_date date,
  p_work_time time,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_discount numeric,
  p_paid numeric,
  p_notes text,
  p_items jsonb
)
returns public.invoices
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_id uuid;
  v_number text;
  v_subtotal numeric(14,2);
  v_discount numeric(14,2);
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_balance numeric(14,2);
  v_status text;
  v_result public.invoices;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_customer_name is null or btrim(p_customer_name)='' then raise exception 'Nama pelanggan wajib diisi'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Minimal satu item'; end if;

  select coalesce(sum(greatest(0,(x->>'quantity')::numeric)*greatest(0,(x->>'unit_price')::numeric)),0)
  into v_subtotal from jsonb_array_elements(p_items) x;

  v_discount:=least(v_subtotal,greatest(0,coalesce(p_discount,0)));
  v_total:=greatest(0,v_subtotal-v_discount);
  v_paid:=least(v_total,greatest(0,coalesce(p_paid,0)));
  v_balance:=greatest(0,v_total-v_paid);
  v_status:=case when v_total>0 and v_paid>=v_total then 'Lunas' when v_paid>0 then 'DP' else 'Belum Lunas' end;

  if p_invoice_id is null then
    v_number:=public.next_invoice_number(extract(year from p_work_date)::integer);
    insert into public.invoices(
      user_id,invoice_number,work_date,work_time,customer_name,customer_phone,
      customer_address,subtotal,discount,total,paid,balance,status,notes
    ) values(
      v_user,v_number,p_work_date,p_work_time,btrim(p_customer_name),
      nullif(btrim(coalesce(p_customer_phone,'')),''),
      nullif(btrim(coalesce(p_customer_address,'')),''),
      v_subtotal,v_discount,v_total,v_paid,v_balance,v_status,
      nullif(btrim(coalesce(p_notes,'')),'')
    ) returning id into v_id;
  else
    update public.invoices set
      work_date=p_work_date,work_time=p_work_time,customer_name=btrim(p_customer_name),
      customer_phone=nullif(btrim(coalesce(p_customer_phone,'')),''),
      customer_address=nullif(btrim(coalesce(p_customer_address,'')),''),
      subtotal=v_subtotal,discount=v_discount,total=v_total,paid=v_paid,
      balance=v_balance,status=v_status,notes=nullif(btrim(coalesce(p_notes,'')),'')
    where id=p_invoice_id and user_id=v_user
    returning id into v_id;

    if v_id is null then raise exception 'Invoice tidak ditemukan atau bukan milik pengguna'; end if;
    delete from public.invoice_items where invoice_id=v_id and user_id=v_user;
  end if;

  insert into public.invoice_items(invoice_id,user_id,description,quantity,unit_price,sort_order)
  select v_id,v_user,btrim(x->>'description'),
         greatest(0.01,(x->>'quantity')::numeric),
         greatest(0,(x->>'unit_price')::numeric),
         ordinality::integer
  from jsonb_array_elements(p_items) with ordinality as t(x,ordinality);

  select * into v_result from public.invoices where id=v_id and user_id=v_user;
  return v_result;
end;
$$;

revoke all on function public.save_invoice(uuid,date,time,text,text,text,numeric,numeric,text,jsonb) from public,anon;
grant execute on function public.save_invoice(uuid,date,time,text,text,text,numeric,numeric,text,jsonb) to authenticated;

create or replace function public.update_invoice_payment(p_invoice_id uuid,p_paid numeric)
returns public.invoices
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_result public.invoices;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select total into v_total from public.invoices
  where id=p_invoice_id and user_id=v_user for update;

  if v_total is null then raise exception 'Invoice tidak ditemukan'; end if;
  v_paid:=least(v_total,greatest(0,coalesce(p_paid,0)));

  update public.invoices set
    paid=v_paid,
    balance=greatest(0,v_total-v_paid),
    status=case when v_total>0 and v_paid>=v_total then 'Lunas' when v_paid>0 then 'DP' else 'Belum Lunas' end
  where id=p_invoice_id and user_id=v_user
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.update_invoice_payment(uuid,numeric) from public,anon;
grant execute on function public.update_invoice_payment(uuid,numeric) to authenticated;

-- Aktifkan realtime tanpa membuat error bila tabel sudah terdaftar.
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='invoices') then
    alter publication supabase_realtime add table public.invoices;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='technicians') then
    alter publication supabase_realtime add table public.technicians;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='invoice_technicians') then
    alter publication supabase_realtime add table public.invoice_technicians;
  end if;
end $$;

commit;
