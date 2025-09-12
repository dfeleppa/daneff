# Supabase Setup Instructions

Follow these steps to set up Supabase for your TaskFlow project:

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: TaskFlow
   - **Database Password**: Generate a secure password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

## Step 2: Get Your Project Credentials

1. Go to Settings → API
2. Copy these values:
   - **Project URL** (e.g., https://your-project.supabase.co)
   - **Project API Key** (anon/public key)

## Step 3: Add Environment Variables

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Set Up Database Schema

The database schema will be created automatically when you run the setup script.

## Step 5: Configure Row Level Security (RLS)

RLS policies will be set up to ensure users can only see their own data and teams they're part of.

## Next Steps

Once you've completed steps 1-3, run the database setup to create all the necessary tables and relationships for TaskFlow.