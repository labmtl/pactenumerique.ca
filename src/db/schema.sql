-- ====================================================================
-- Schéma de Base de Données : pactenumerique.ca
-- Hébergement : WHC.ca (Web Hosting Canada) - MySQL 8 / MariaDB
-- Encodage : utf8mb4
-- ====================================================================

-- 1. Engagements individuels (sans lien direct avec les cercles)
CREATE TABLE IF NOT EXISTS pact_commitments (
    id VARCHAR(36) PRIMARY KEY,
    fsa VARCHAR(3) NOT NULL,
    province VARCHAR(2) NOT NULL,
    email_hash VARCHAR(64) UNIQUE NULL,
    encrypted_email TEXT NULL,
    push_subscription TEXT NULL,
    target_networks TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fsa (fsa),
    INDEX idx_province (province),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Cercles d'invitation aveugles (Zero-Knowledge Blind Circles)
CREATE TABLE IF NOT EXISTS blind_circles (
    blind_id VARCHAR(64) PRIMARY KEY,
    target_count INT NOT NULL DEFAULT 5,
    current_count INT NOT NULL DEFAULT 1,
    is_triggered TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_triggered (is_triggered)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Abonnements Web Push liés aux cercles aveugles (sans données nominatives)
CREATE TABLE IF NOT EXISTS circle_push_listeners (
    id VARCHAR(36) PRIMARY KEY,
    blind_id VARCHAR(64) NOT NULL,
    push_subscription TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_blind_id (blind_id),
    CONSTRAINT fk_circle FOREIGN KEY (blind_id) REFERENCES blind_circles(blind_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Statistiques territoriales en cache (RTA / FSA)
CREATE TABLE IF NOT EXISTS territory_stats (
    fsa VARCHAR(3) PRIMARY KEY,
    province VARCHAR(2) NOT NULL,
    signers_count INT NOT NULL DEFAULT 0,
    target_threshold INT NOT NULL DEFAULT 100,
    INDEX idx_signers (signers_count),
    INDEX idx_territory_province (province)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
