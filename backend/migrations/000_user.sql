-- Base "User" table. Earlier it was created by Prisma, so a fresh database had no
-- schema for it and 001 (which references "User") failed. IF NOT EXISTS keeps
-- already-initialised databases untouched.

CREATE TABLE IF NOT EXISTS "User" (
  "id"              SERIAL PRIMARY KEY,
  "fullname"        VARCHAR(255) NOT NULL,
  "avatarUrl"       VARCHAR(255),
  "email"           VARCHAR(255) NOT NULL UNIQUE,
  "emailVerifiedAt" TIMESTAMPTZ,
  "password"        VARCHAR(255) NOT NULL,
  "rememberToken"   VARCHAR(255),
  "createdAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
