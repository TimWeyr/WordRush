-- Table for storing base, correct, and distractor objects
-- All three types are stored in a single table with a type discriminator

create table public.round_objects (
  -- Primary key
  id bigserial primary key,
  
  -- Foreign key to rounds table
  round_id text not null,  -- e.g., "ELH_001", "BC_001"
  theme_id text not null,  -- e.g., "english_cap", "business_english" (for quick filtering)
  
  -- Type discriminator
  object_type text not null check (object_type in ('base', 'correct', 'distractor')),
  
  -- Order index: 0 for base, 0,1,2... for correct/distractors arrays
  order_index integer not null default 0,
  
  -- Entry fields (common to all types)
  word text,
  entry_type text,  -- "Noun", "Translation", "Wrong", etc.
  image text,  -- Optional image filename
  
  -- Visual configuration (JSONB for flexibility)
  visual jsonb not null,  -- {color, variant, pulsate, shake, fontSize, tier, size, appearance, glow}
  
  -- Spawn & Movement (for correct and distractors)
  spawn_position decimal,
  spawn_spread decimal,
  speed decimal,
  
  -- Gameplay (for correct and distractors)
  points integer,
  hp integer,
  
  -- Correct-specific fields
  pattern text,  -- "linear_inward", etc.
  collection_order integer,  -- Order in which correct objects should be collected
  
  -- Distractor-specific fields
  damage integer,
  behavior text,  -- "seek_center", etc.
  redirect text,  -- Redirect to another word/concept
  
  -- Common fields
  context text,  -- Context/explanation text
  sound text,  -- Sound effect name
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now()),
  
  -- Constraints
  constraint round_objects_round_id_fkey foreign key (round_id) references public.rounds(id) on delete cascade,
  
  -- Indexes for performance
  constraint round_objects_unique_round_type_order unique (round_id, object_type, order_index)
);

-- Indexes
create index idx_round_objects_round_id on public.round_objects(round_id);
create index idx_round_objects_theme_id on public.round_objects(theme_id);
create index idx_round_objects_type on public.round_objects(object_type);
create index idx_round_objects_word on public.round_objects(word);

-- Comments
comment on table public.round_objects is 'Stores base, correct, and distractor objects for game rounds';
comment on column public.round_objects.round_id is 'Foreign key to rounds.id (e.g., "ELH_001")';
comment on column public.round_objects.theme_id is 'Theme ID for quick filtering (e.g., "english_cap")';
comment on column public.round_objects.object_type is 'Type: base, correct, or distractor';
comment on column public.round_objects.order_index is 'Order in array: 0 for base, 0,1,2... for correct/distractors';
comment on column public.round_objects.visual is 'Visual configuration JSONB: {color, variant, pulsate, shake, fontSize, tier, size, appearance, glow}';

