## Step 3: Configure Google OAuth in Supabase

You need to configure Google OAuth in your Supabase dashboard:

### 1. Go to Supabase Dashboard
- Visit: https://vxrvivyasfqjmsafocpe.supabase.co
- Go to Authentication → Providers

### 2. Enable Google Provider
- Enable the Google provider
- Add your Google OAuth credentials:
  - Client ID: `1040487190199-o532burethk6hikknofkcvra1m8puhlf.apps.googleusercontent.com`
  - Client Secret: `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`

### 3. Add Redirect URLs in Google Cloud Console
Add these additional redirect URLs to your Google OAuth app:
- `https://vxrvivyasfqjmsafocpe.supabase.co/auth/v1/callback`

### 4. Enable Email Confirmations (Optional)
- Go to Authentication → Settings
- Disable "Enable email confirmations" if you want immediate access

This will allow Supabase to handle the OAuth flow and automatically create UUIDs for users.