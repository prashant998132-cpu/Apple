-- JARVIS Mayur Edition — Supabase Setup (Online-first)
-- Run: Supabase Dashboard → SQL Editor → Paste → Run

create table if not exists chat_messages (id text primary key, user_id text not null, chat_id text not null, message text not null, role text check (role in ('user','assistant')), metadata jsonb default '{}', created_at timestamptz default now());
create index if not exists idx_chat_user on chat_messages(user_id);
create index if not exists idx_chat_id   on chat_messages(chat_id);

create table if not exists location_history (id bigserial primary key, user_id text not null, lat float not null, lon float not null, accuracy float, city text, area text, district text, state text, address text, label text, created_at timestamptz default now());
create index if not exists idx_loc_user    on location_history(user_id);
create index if not exists idx_loc_created on location_history(created_at desc);

create table if not exists saved_places (id text primary key, user_id text not null, name text not null, emoji text default '📍', lat float not null, lon float not null, radius_meters int default 200, created_at timestamptz default now());

create table if not exists memories (id text primary key, user_id text not null, type text, content text not null, importance int default 5, tags text[] default '{}', language text default 'hindi', timestamp bigint not null);

create table if not exists user_profiles (user_id text primary key, name text default 'Mayur', language text default 'hindi', city text default 'Nadan', lat float default 23.5667, lon float default 81.2833, timezone text default 'Asia/Kolkata', preferences jsonb default '{"neet":true}', updated_at timestamptz default now());

alter table chat_messages    enable row level security;
alter table location_history enable row level security;
alter table saved_places     enable row level security;
alter table memories         enable row level security;
alter table user_profiles    enable row level security;

create policy "open" on chat_messages    for all using (true);
create policy "open" on location_history for all using (true);
create policy "open" on saved_places     for all using (true);
create policy "open" on memories         for all using (true);
create policy "open" on user_profiles    for all using (true);
