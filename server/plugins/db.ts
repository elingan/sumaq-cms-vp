// Initialise the DB connection on server startup.
// For PGlite (dev) this pushes the schema on first run so no manual
// migration step is required. Errors are surfaced early.
export default defineNitroPlugin(async () => {
  if (!process.env.DATABASE_URL) {
    try {
      const { PGlite } = await import('@electric-sql/pglite')
      const dataDir = process.env.PGLITE_DATA_DIR || `${process.cwd()}/.data/pglite`
      const client = new PGlite(dataDir)

      await client.exec(`
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('admin', 'partner', 'owner', 'editor');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE TYPE site_user_role AS ENUM ('owner', 'editor', 'partner');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE TYPE site_status AS ENUM ('active', 'archived');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE TYPE page_status AS ENUM ('draft', 'published');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT,
          role user_role NOT NULL DEFAULT 'editor',
          github_data JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug TEXT UNIQUE,
          name TEXT NOT NULL,
          description TEXT,
          language TEXT NOT NULL DEFAULT 'en',
          domain TEXT,
          site_url TEXT,
          screenshot_url TEXT,
          github_repo_url TEXT,
          github_branch TEXT NOT NULL DEFAULT 'main',
          vercel_project_id TEXT,
          vercel_url TEXT,
          template TEXT NOT NULL DEFAULT 'blank',
          status site_status NOT NULL DEFAULT 'active',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS site_users (
          site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role site_user_role NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (site_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS pages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
          type TEXT NOT NULL DEFAULT 'page',
          name TEXT NOT NULL,
          title TEXT,
          content_json JSONB,
          schema_yaml TEXT,
          status page_status NOT NULL DEFAULT 'draft',
          published_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS media (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
          filename TEXT NOT NULL,
          url TEXT NOT NULL,
          thumbnail_url TEXT,
          size_bytes INTEGER,
          mime_type TEXT,
          dimensions JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          details JSONB,
          ip_address TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action TEXT NOT NULL,
          target_type TEXT,
          target_id UUID,
          changes JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS password_resets (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `)

      await client.close()
      console.log('[db] PGlite schema ready')
    } catch (e) {
      console.error('[db] PGlite schema error:', e)
    }
  } else {
    console.log('[db] Neon connection ready')
  }
})
