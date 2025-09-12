# Google OAuth Setup Instructions

To complete the Google OAuth authentication setup, you need to create Google OAuth credentials:

## Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
4. Create credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://your-vercel-domain.vercel.app` (for production)
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://your-vercel-domain.vercel.app/api/auth/callback/google` (for production)
   - Click "Create"

## Step 2: Update Environment Variables

Update your `.env.local` file with the credentials:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secure-random-secret-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

## Step 3: Update Vercel Environment Variables

For production deployment, add these environment variables in your Vercel dashboard:
1. Go to your project in Vercel
2. Navigate to Settings → Environment Variables
3. Add the following variables:
   - `NEXTAUTH_URL`: `https://your-domain.vercel.app`
   - `NEXTAUTH_SECRET`: A secure random string (you can generate one at https://generate-secret.vercel.app/32)
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret

## Step 4: Generate NextAuth Secret

You can generate a secure secret by running:
```bash
openssl rand -base64 32
```

Or use: https://generate-secret.vercel.app/32

## Step 5: Test the Authentication

1. Restart your development server: `npm run dev`
2. Visit http://localhost:3000
3. You should be redirected to the sign-in page
4. Click "Continue with Google" to test the authentication flow

## Security Notes

- Keep your Google Client Secret secure and never commit it to version control
- Use different OAuth credentials for development and production
- The `.env.local` file is already in `.gitignore` to prevent accidental commits
