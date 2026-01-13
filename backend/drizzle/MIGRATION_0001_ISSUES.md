# Migration 0001 Scope Creep Issue

## Problem

Migration `0001_empty_paper_doll.sql` contains scope creep - multiple unrelated changes:

1. ✅ **Intended for Task 1**: Added `custom_interval_days` column to subscriptions table
2. ❌ **Scope creep**: Created `currency_rates` table (unrelated to Task 1)
3. ❌ **Scope creep**: Changed `user_id` columns from uuid to text across multiple tables (unrelated to Task 1)
4. ❌ **Scope creep**: Changed `users.id` from uuid to text (unrelated to Task 1)

## Correct Migration for Task 1

The migration for Task 1 should have ONLY contained:

```sql
ALTER TABLE "subscriptions" ADD COLUMN "custom_interval_days" integer;
```

## Current State

All changes from migration 0001 have been applied to the database:
- `custom_interval_days` column exists in subscriptions table
- `currency_rates` table exists
- `user_id` columns are text type
- `users.id` is text type

## Why Can't We Fix It Now

1. **Database State**: Changes are already applied to production database
2. **Dependent Work**: Subsequent commits (validation, frontend) depend on these changes
3. **Breaking Changes**: Reverting scope creep would break existing functionality
4. **Data Loss Risk**: Changing column types back could lose data or break relationships

## Lessons Learned

For future migrations:
1. ✅ Keep migrations atomic and focused on a single change
2. ✅ Review generated migrations before committing
3. ✅ Separate unrelated schema changes into different migrations
4. ✅ Test migrations in development before applying to production
5. ✅ Document migration dependencies and relationships

## Reference Implementation

For reference, a proper minimal migration for adding `custom_interval_days`:

```sql
-- Task 1: Add customIntervalDays field to subscriptions table
-- Generated: 2026-01-13
-- Purpose: Store custom billing cycle intervals in days

ALTER TABLE "subscriptions" ADD COLUMN "custom_interval_days" integer;
```

This is the ONLY change that should have been in Task 1's migration.
