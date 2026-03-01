-- Add YOUTUBE and FORUM as supported community platforms.
ALTER TYPE "CommunityPlatform" ADD VALUE IF NOT EXISTS 'YOUTUBE';
ALTER TYPE "CommunityPlatform" ADD VALUE IF NOT EXISTS 'FORUM';
