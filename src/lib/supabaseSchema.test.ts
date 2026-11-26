import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Supabase migration and security checks', () => {
  const migrationPath = resolve(
    process.cwd(),
    'supabase/migrations/001_initial_schema.sql'
  );
  const migrationSql = readFileSync(migrationPath, 'utf-8');

  it('defines chats and messages tables with cascade deletes', () => {
    expect(migrationSql).toContain('create table if not exists public.chats');
    expect(migrationSql).toContain('create table if not exists public.messages');
    expect(migrationSql).toContain('on delete cascade');
  });

  it('enables Row Level Security and user ownership policies on both tables', () => {
    expect(migrationSql).toContain('alter table public.chats enable row level security');
    expect(migrationSql).toContain('alter table public.messages enable row level security');
    expect(migrationSql).toContain('auth.uid() = user_id');
  });

  it('ensures .env.example contains only public placeholder keys', () => {
    const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf-8');
    expect(envExample).toContain('VITE_SUPABASE_URL=');
    expect(envExample).toContain('VITE_SUPABASE_ANON_KEY=');
    expect(envExample).not.toMatch(/^VITE_.*SECRET=/m);
    expect(envExample).not.toMatch(/^VITE_.*SERVICE_ROLE/m);
  });
});
