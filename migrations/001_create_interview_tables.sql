CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  difficulty INT NOT NULL,
  skills TEXT[],
  expected_points TEXT[],
  used_count INT DEFAULT 0,
  avg_score DECIMAL(5,2)
);

CREATE TABLE IF NOT EXISTS interview_records (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  question_id UUID,
  question_content TEXT,
  answer_content TEXT,
  evaluation JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_type_difficulty ON question_bank(type, difficulty);
CREATE INDEX IF NOT EXISTS idx_interview_records_session_id ON interview_records(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_records_created_at ON interview_records(created_at DESC);
