import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';

// TODO: add providers (e.g. Google) and callbacks in authOptions
const authOptions: NextAuthOptions = {
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
