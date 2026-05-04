-- Create database and user for Moonshine LMS
-- Run this in pgAdmin or any PostgreSQL query tool

-- 1. Create user
CREATE USER moonshine WITH PASSWORD 'moonshine';

-- 2. Create database
CREATE DATABASE moonshine_lms;

-- 3. Grant privileges
GRANT ALL PRIVILEGES ON DATABASE moonshine_lms TO moonshine;

-- 4. Connect to the new database and grant schema permissions
\c moonshine_lms;
GRANT ALL ON SCHEMA public TO moonshine;
ALTER DATABASE moonshine_lms OWNER TO moonshine;
