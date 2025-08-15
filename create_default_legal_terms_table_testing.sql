-- Create default_legal_terms table for storing owner-specific default legal terms
-- TESTING VERSION - RLS temporarily disabled for development

-- Create the table
CREATE TABLE IF NOT EXISTS public.default_legal_terms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid NOT NULL, -- No foreign key constraint for testing
    terms text NOT NULL DEFAULT '',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(owner_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_default_legal_terms_owner_id ON public.default_legal_terms(owner_id);

-- TEMPORARILY DISABLE RLS FOR TESTING
-- ALTER TABLE public.default_legal_terms ENABLE ROW LEVEL SECURITY;

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

-- Insert a test record for Owner 1
INSERT INTO public.default_legal_terms (owner_id, terms)
VALUES ('11111111-1111-1111-1111-111111111111', 'Standard terms and conditions apply.')
ON CONFLICT (owner_id) DO NOTHING;

-- NOTE: When ready for production, run the following to enable RLS:
-- ALTER TABLE public.default_legal_terms ENABLE ROW LEVEL SECURITY;
--
-- Then create the RLS policies:
-- CREATE POLICY "Users can view their own default legal terms" ON public.default_legal_terms
--     FOR SELECT USING (auth.uid() = owner_id);
-- CREATE POLICY "Users can insert their own default legal terms" ON public.default_legal_terms
--     FOR INSERT WITH CHECK (auth.uid() = owner_id);
-- CREATE POLICY "Users can update their own default legal terms" ON public.default_legal_terms
--     FOR UPDATE USING (auth.uid() = owner_id);
-- CREATE POLICY "Users can delete their own default legal terms" ON public.default_legal_terms
--     FOR DELETE USING (auth.uid() = owner_id);
