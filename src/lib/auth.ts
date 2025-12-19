import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const adapter = PrismaAdapter(prisma);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: {
    ...adapter,
    async deleteSession(sessionToken) {
      try {
        return await prisma.session.delete({ where: { sessionToken } });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2025"
        ) {
          return null;
        }
        throw err;
      }
    },
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "github" || !profile) return;

      const githubProfile = profile as {
        login?: string;
        id?: number;
        created_at?: string;
      };

      const accountAge = githubProfile.created_at
        ? Math.floor(
            (Date.now() - new Date(githubProfile.created_at).getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          )
        : null;

      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            username: githubProfile.login,
            githubId: githubProfile.id?.toString(),
            accountAge,
          },
        });
      } catch {
        try {
          const existingByEmail = user.email
            ? await prisma.user.findUnique({ where: { email: user.email } })
            : null;

          if (!existingByEmail) return;

          await prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
              username: githubProfile.login,
              githubId: githubProfile.id?.toString(),
              accountAge,
            },
          });
        } catch {
          return;
        }
      }
    },
  },
  pages: {
    signIn: "/",
  },
});
