import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { syncUserWithSupabase } from './api/users'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow Google OAuth
      if (account?.provider !== 'google') {
        return false
      }

      // Sync user with Supabase
      if (user.email && user.name && user.id) {
        try {
          await syncUserWithSupabase({
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image || undefined,
          })
        } catch (error) {
          console.error('Error syncing user with Supabase:', error)
          // Don't block sign-in if sync fails
        }
      }

      return true
    },
    async jwt({ token, account, profile, user }) {
      if (account) {
        token.accessToken = account.access_token
      }
      // Persist user ID in token
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken
      // Add user ID to session
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
}
