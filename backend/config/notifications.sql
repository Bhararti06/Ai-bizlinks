CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    organization_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'meeting', 'approval', 'info'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Index for faster retrieval of user notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
