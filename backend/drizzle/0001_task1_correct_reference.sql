-- Task 1: Add Database Schema Field - Correct Implementation
-- This is what migration 0001 SHOULD have contained
-- Only change: Add custom_interval_days column to subscriptions table

ALTER TABLE "subscriptions" ADD COLUMN "custom_interval_days" integer;
