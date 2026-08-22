-- Autrom database schema (PostgreSQL)

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One row per user; holds the master toggle + chosen posting interval
CREATE TABLE pipeline_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  interval_hours INT NOT NULL DEFAULT 6 CHECK (interval_hours IN (2,4,6,8,10,12)),
  niche TEXT DEFAULT 'general',
  next_run_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Linked social accounts (tokens should be encrypted at rest, not stored plaintext)
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube','tiktok','instagram','facebook','linkedin','x')),
  external_account_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_via TEXT DEFAULT 'ayrshare', -- 'ayrshare' | 'upload-post' | 'native_oauth'
  status TEXT DEFAULT 'linked', -- 'linked' | 'expired' | 'revoked'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- One row per generated video concept
CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  niche TEXT,
  hook TEXT,
  full_script TEXT,
  scene_prompts JSONB, -- array of {scene, visual_prompt, duration_sec}
  captions JSONB,       -- localized captions, e.g. {"en": "...", "es": "..."}
  status TEXT DEFAULT 'draft', -- draft | approved | used
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One row per rendered/composed video, tied back to its script
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  voiceover_url TEXT,
  raw_clip_urls JSONB,       -- array of generated clip URLs before composition
  final_video_url TEXT,      -- final 9:16 MP4
  composition_provider TEXT, -- 'shotstack' | 'creatomate'
  duration_sec INT,
  status TEXT DEFAULT 'pending', -- pending | rendering | ready | failed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One row per publish attempt per platform
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  caption TEXT,
  status TEXT DEFAULT 'queued', -- queued | posted | failed
  error_message TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Execution log — every pipeline stage transition, for the dashboard log view
CREATE TABLE execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL, -- ideation | scripting | tts | video_gen | compose | publish
  status TEXT NOT NULL, -- ok | error | pending
  message TEXT,
  ref_id UUID, -- points at scripts.id / videos.id / posts.id depending on stage
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_logs_user_time ON execution_logs(user_id, created_at DESC);
CREATE INDEX idx_posts_video ON posts(video_id);
