CREATE TABLE IF NOT EXISTS mri_qadmin_chat (
    message text NOT NULL,
    citizenid VARCHAR(50) NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS mri_qadmin_groups (
    id VARCHAR(50) PRIMARY KEY, -- 'admin', 'mod', etc.
    label VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS mri_qadmin_group_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id VARCHAR(50) NOT NULL,
    permission VARCHAR(255) NOT NULL,
    FOREIGN KEY (group_id) REFERENCES mri_qadmin_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS mri_qadmin_character_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    citizenid VARCHAR(50) NOT NULL,
    group_id VARCHAR(50) NOT NULL,
    FOREIGN KEY (group_id) REFERENCES mri_qadmin_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS mri_qadmin_masters (
    license VARCHAR(100) PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS mri_qadmin_wall_colors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    principal VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE mri_qadmin_wall_colors MODIFY color VARCHAR(50);

CREATE TABLE IF NOT EXISTS mri_qadmin_settings (
    name VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'string'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE mri_qadmin_settings ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'string';

CREATE TABLE IF NOT EXISTS mri_qadmin_actions (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(20) NOT NULL,
    data LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
