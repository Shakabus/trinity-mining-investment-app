-- Add preferred_language to users
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(191) NOT NULL DEFAULT 'en';
