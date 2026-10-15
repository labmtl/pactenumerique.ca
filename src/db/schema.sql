-- ====================================================================
-- Schéma de Base de Données : pactenumerique.ca
-- Hébergement : WHC.ca (Web Hosting Canada) - PostgreSQL 15 / 16
-- ====================================================================

-- 1. Engagements individuels (sans lien direct avec les cercles)
CREATE TABLE IF NOT EXISTS pact_commitments (
    id VARCHAR(36) PRIMARY KEY,
    fsa VARCHAR(3) NOT NULL,
    province VARCHAR(2) NOT NULL,
    email_hash VARCHAR(64) UNIQUE,
    encrypted_email TEXT,
    push_subscription TEXT,
    target_networks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pact_fsa ON pact_commitments (fsa);
CREATE INDEX IF NOT EXISTS idx_pact_province ON pact_commitments (province);
CREATE INDEX IF NOT EXISTS idx_pact_created_at ON pact_commitments (created_at);

-- 2. Cercles d'invitation aveugles (Zero-Knowledge Blind Circles)
CREATE TABLE IF NOT EXISTS blind_circles (
    blind_id VARCHAR(64) PRIMARY KEY,
    target_count INT NOT NULL DEFAULT 5,
    current_count INT NOT NULL DEFAULT 1,
    is_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blind_triggered ON blind_circles (is_triggered);

-- 3. Abonnements Web Push liés aux cercles aveugles (sans données nominatives)
CREATE TABLE IF NOT EXISTS circle_push_listeners (
    id VARCHAR(36) PRIMARY KEY,
    blind_id VARCHAR(64) NOT NULL REFERENCES blind_circles(blind_id) ON DELETE CASCADE,
    push_subscription TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_listener_blind_id ON circle_push_listeners (blind_id);

-- 4. Statistiques territoriales en cache (RTA / FSA)
CREATE TABLE IF NOT EXISTS territory_stats (
    fsa VARCHAR(3) PRIMARY KEY,
    province VARCHAR(2) NOT NULL,
    signers_count INT NOT NULL DEFAULT 0,
    target_threshold INT NOT NULL DEFAULT 100
);

CREATE INDEX IF NOT EXISTS idx_territory_signers ON territory_stats (signers_count);
CREATE INDEX IF NOT EXISTS idx_territory_province ON territory_stats (province);
