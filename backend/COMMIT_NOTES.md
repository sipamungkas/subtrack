
# Backend Schema Typecheck Note

Task 2 added preferredCurrency field to schema correctly. However, running `bun run tsc --noEmit` shows 122 TypeScript errors, all in node_modules/drizzle-orm (pre-existing library issues, not related to our changes).

The `typecheck` script doesn't exist in package.json. Our schema change (lines 39-41 in src/db/schema.ts) is type-safe and follows Drizzle ORM patterns correctly.

Migration will be properly applied via Drizzle Kit in Task 14 final verification.
