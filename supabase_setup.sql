-- =========================================================================
-- Vocaria AI - Supabase Database Schema
-- Run this script in the Supabase SQL Editor to set up your tables
-- =========================================================================

-- 1. Create public.users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create voice_profiles table
CREATE TABLE public.voice_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  audio_url TEXT,
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create clone_jobs table
CREATE TABLE public.clone_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  source_audio_url TEXT,
  result_voice_id UUID REFERENCES public.voice_profiles(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create generation_jobs table (TTS)
CREATE TABLE public.generation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  voice_id UUID REFERENCES public.voice_profiles(id) ON DELETE CASCADE NOT NULL,
  text_prompt TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  result_audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- Enable Row Level Security (RLS)
-- =========================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clone_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Voice profiles RLS
CREATE POLICY "Users can view own voices" ON public.voice_profiles FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can insert own voices" ON public.voice_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voices" ON public.voice_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own voices" ON public.voice_profiles FOR DELETE USING (auth.uid() = user_id);

-- Clone jobs RLS
CREATE POLICY "Users can view own clone jobs" ON public.clone_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clone jobs" ON public.clone_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clone jobs" ON public.clone_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clone jobs" ON public.clone_jobs FOR DELETE USING (auth.uid() = user_id);

-- Generation jobs RLS
CREATE POLICY "Users can view own generation jobs" ON public.generation_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own generation jobs" ON public.generation_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own generation jobs" ON public.generation_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own generation jobs" ON public.generation_jobs FOR DELETE USING (auth.uid() = user_id);

-- Notifications RLS
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- Triggers for Auth
-- Automatically create a user profile when a new user signs up
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, credits, tier)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    100, -- Free credits
    'free'
  );
  
  -- Insert welcome notification
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    NEW.id,
    'system_alert',
    '👋 Welcome to Vocaria AI!',
    'Your creative workspace is ready. Start by cloning your first voice.'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
