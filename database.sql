CREATE TABLE IF NOT EXISTS mri_qadmin_chat (
    message text NOT NULL,
    citizenid VARCHAR(50) NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS mri_qadmin_aces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    principal VARCHAR(255) NOT NULL,
    object VARCHAR(255) NOT NULL,
    allow INT NOT NULL DEFAULT 1, -- 1 = allow, 0 = deny
    description VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS mri_qadmin_principals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    child VARCHAR(255) NOT NULL,
    parent VARCHAR(255) NOT NULL,
    description VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
