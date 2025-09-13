-- Alternative: Use Supabase Auth properly with UUIDs
-- This requires setting up proper authentication flow

-- Step 1: Create a trigger to auto-create users when they sign up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Step 3: Update RLS policies to use auth.uid() directly
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
CREATE POLICY "Users can view their workspaces"
ON workspaces FOR SELECT
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view projects" ON projects;
CREATE POLICY "Users can view projects"
ON projects FOR SELECT
USING (
  workspace_id IN (
    SELECT id 
    FROM workspaces 
    WHERE owner_id = auth.uid()
  )
);