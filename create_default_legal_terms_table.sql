-- Create default_legal_terms table for storing owner-specific default legal terms
-- This table will be used to automatically populate legal terms for new quotes

-- Create the table
CREATE TABLE IF NOT EXISTS public.default_legal_terms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    terms text NOT NULL DEFAULT '',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(owner_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_default_legal_terms_owner_id ON public.default_legal_terms(owner_id);

-- Enable Row Level Security
ALTER TABLE public.default_legal_terms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see and modify their own default legal terms
CREATE POLICY "Users can view their own default legal terms" ON public.default_legal_terms
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own default legal terms" ON public.default_legal_terms
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own default legal terms" ON public.default_legal_terms
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own default legal terms" ON public.default_legal_terms
    FOR DELETE USING (auth.uid() = owner_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_default_legal_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_default_legal_terms_updated_at
    BEFORE UPDATE ON public.default_legal_terms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_default_legal_terms_updated_at();

-- Insert a default record for existing users (optional)
-- This can be run manually if you want to provide initial default terms
-- INSERT INTO public.default_legal_terms (owner_id, terms)
-- SELECT DISTINCT owner_id, 'Standard terms and conditions apply.'
-- FROM public.quotes
-- WHERE owner_id IS NOT NULL
-- ON CONFLICT (owner_id) DO NOTHING;
