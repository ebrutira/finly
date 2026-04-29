CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  balance DECIMAL(15,2) DEFAULT 10000.00,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_login DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE portfolio (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  amount DECIMAL(15,8) NOT NULL,
  avg_buy_price DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  type VARCHAR(4) NOT NULL,
  amount DECIMAL(15,8) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  badge_name VARCHAR(50) NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE friendships (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  status VARCHAR(10) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);