-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  first_name text,
  last_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create medical_records table
CREATE TABLE public.medical_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  record_date date not null,
  extracted_data jsonb,
  embedding vector(1536), -- Assuming OpenAI text-embedding-ada-002 or text-embedding-3-small (1536 dimensions)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create appointments table
CREATE TABLE public.appointments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  doctor_name text not null,
  appointment_date timestamp with time zone not null,
  reminder_status boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile."
  ON public.profiles FOR SELECT
  USING ( auth.uid() = id );

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

-- Medical Records Policies
CREATE POLICY "Users can view their own medical records."
  ON public.medical_records FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert their own medical records."
  ON public.medical_records FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their own medical records."
  ON public.medical_records FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete their own medical records."
  ON public.medical_records FOR DELETE
  USING ( auth.uid() = user_id );

-- Appointments Policies
CREATE POLICY "Users can view their own appointments."
  ON public.appointments FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert their own appointments."
  ON public.appointments FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their own appointments."
  ON public.appointments FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete their own appointments."
  ON public.appointments FOR DELETE
  USING ( auth.uid() = user_id );
