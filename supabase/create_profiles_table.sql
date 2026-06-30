-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  name text,
  age integer,
  gender text,
  blood_group text,
  emergency_contacts text,
  allergies text,
  existing_diseases text,
  updated_at timestamp with time zone
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Users can view own profile." on profiles
  for select using (auth.uid() = id);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);
