import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getDb } from "@/db";
import { appConfig } from "@/config";
import { users } from "@/db/schema";
import { normalizeMobile, validateIndianMobile } from "@/lib/mobile";
import { verifyPassword } from "@/lib/password";
import { getUserProfile } from "@/lib/user-service";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: Date | null;
      mobile: string;
      role: string;
      profileImageUrl: string | null;
      mustChangePassword: boolean;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    emailVerified: Date | null;
    mobile: string;
    role: string;
    profileImageUrl: string | null;
    mustChangePassword: boolean;
  }
}

async function enrichSessionFromDb(
  session: import("next-auth").Session,
): Promise<import("next-auth").Session> {
  const userId = session.user?.id;
  if (!userId) {
    return session;
  }

  const profile = await getUserProfile(userId);
  if (!profile) {
    return session;
  }

  session.user.name = profile.name;
  session.user.profileImageUrl = profile.profileImageUrl;
  return session;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: appConfig.authSecret,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "mobile",
      credentials: {
        mobile: { label: "Mobile", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const mobile = normalizeMobile(String(credentials?.mobile ?? ""));
        const password = String(credentials?.password ?? "");

        if (!validateIndianMobile(mobile) || password.length < 8) {
          return null;
        }

        const db = getDb();
        const [user] = await db
          .select({
            id: users.id,
            name: users.name,
            mobile: users.mobile,
            role: users.role,
            passwordHash: users.passwordHash,
            profileImageUrl: users.profileImageUrl,
            mustChangePassword: users.mustChangePassword,
          })
          .from(users)
          .where(eq(users.mobile, mobile))
          .limit(1);

        if (!user) {
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: `${user.mobile}@step-up.local`,
          emailVerified: null,
          mobile: user.mobile,
          role: user.role,
          profileImageUrl: user.profileImageUrl,
          mustChangePassword: user.mustChangePassword,
        } satisfies import("next-auth").User;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
        token.mobile = user.mobile;
        token.profileImageUrl = user.profileImageUrl ?? null;
        token.mustChangePassword = user.mustChangePassword;
      }

      if (trigger === "update" && session?.user) {
        if (session.user.name) {
          token.name = session.user.name;
        }
        if (session.user.profileImageUrl !== undefined) {
          token.profileImageUrl = session.user.profileImageUrl;
        }
        if (session.user.mustChangePassword !== undefined) {
          token.mustChangePassword = session.user.mustChangePassword;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: String(token.id ?? ""),
        name: String(token.name ?? session.user?.name ?? ""),
        email: String(session.user?.email ?? token.email ?? ""),
        emailVerified: null,
        mobile: String(token.mobile ?? ""),
        role: String(token.role ?? "user"),
        profileImageUrl:
          token.profileImageUrl === undefined || token.profileImageUrl === null
            ? null
            : String(token.profileImageUrl),
        mustChangePassword: token.mustChangePassword === true,
      };

      return enrichSessionFromDb(session);
    },
  },
});
