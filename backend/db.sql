CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
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

CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  type VARCHAR(4) NOT NULL,
  quantity DECIMAL(15,8) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
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

-- Tanımlı görev şablonları (sabit liste, admin tarafından yönetilir)
CREATE TABLE quest_definitions (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,  -- örn: 'first_buy', 'five_assets'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  total INTEGER NOT NULL DEFAULT 1, -- tamamlanması gereken adım sayısı
  xp_reward INTEGER NOT NULL DEFAULT 30,
  icon VARCHAR(10) DEFAULT '↗'
);

-- Kullanıcı bazlı görev ilerlemesi
CREATE TABLE user_quests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  quest_id INTEGER REFERENCES quest_definitions(id),
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  UNIQUE(user_id, quest_id)
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  icon VARCHAR(50) DEFAULT 'notifications-outline',
  type VARCHAR(20) DEFAULT 'primary',  -- 'primary' | 'success' | 'danger'
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE watchlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

CREATE TABLE password_resets (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Başlangıç görev tanımları
INSERT INTO quest_definitions (key, name, description, total, xp_reward, icon) VALUES
  ('first_buy',    'İlk Hisse Al',     'Herhangi bir hisse senedi satın al',   1, 50,  '↗'),
  ('five_assets',  '5 Farklı Varlık',  'Portföyüne 5 farklı varlık ekle',      5, 120, '◉'),
  ('ten_trades',   '10 İşlem Yap',     'Toplam 10 alım veya satım gerçekleştir', 10, 80, '≡'),
  ('daily_trade',  'Günlük İşlem',     'Bugün en az bir işlem gerçekleştir',   1, 20,  '◇');