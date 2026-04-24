-- ─────────────────────────────────────────────────────────────────────────────
-- 001_create_schemas.sql
--
-- Create one PostgreSQL schema per bounded context.
-- This is the DB-level enforcement of module isolation (Rule 1).
-- A module's application code only queries its own schema.
-- Cross-schema JOINs are allowed in query handlers only (Rule 2).
--
-- Migration path to microservices:
--   Each schema becomes a separate database in a separate service.
--   The repository files are the only things that change — not the domain.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS customers;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS discounts;
CREATE SCHEMA IF NOT EXISTS orders;
