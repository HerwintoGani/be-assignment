-- Create the m_user table
CREATE TABLE m_user (
    user_id SERIAL PRIMARY KEY,
    user_email VARCHAR(50) NOT NULL UNIQUE,
    user_password VARCHAR(200) NOT NULL
);

-- Create the m_account table
CREATE TABLE m_account (
    account_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    account_name VARCHAR(50) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES m_user(user_id),
    UNIQUE (user_id, account_type)
);

-- Create the t_transaction table
CREATE TABLE t_transaction (
    transaction_id SERIAL PRIMARY KEY,
    account_id INT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    transaction_amount BIGINT NOT NULL,
    transaction_currency VARCHAR(10) NOT NULL,
    transaction_status BOOLEAN NOT NULL,
    transaction_send_to INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (account_id) REFERENCES m_account(account_id),
    FOREIGN KEY (transaction_send_to) REFERENCES m_account(account_id)
);

-- Create the t_transaction_schedule table
CREATE TABLE t_transaction_schedule (
    transaction_schedule_id SERIAL PRIMARY KEY,
    account_id INT NOT NULL,
    transaction_schedule_type VARCHAR(50) NOT NULL,
    transaction_schedule_amount BIGINT NOT NULL,
    transaction_schedule_currency VARCHAR(10) NOT NULL,
    transaction_schedule_status BOOLEAN NOT NULL,
    transaction_schedule_send_to INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    repeat_interval_minutes INT,
    repeated_at TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES m_account(account_id),
    FOREIGN KEY (transaction_schedule_send_to) REFERENCES m_account(account_id)
);
