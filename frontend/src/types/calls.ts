export interface ChatMessage {
  id: number;
  call_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface CallAnalysis {
  id: number;
  call_id: number;
  risk_level: string;
  sentiment_score: number;
  summary?: string;
  recommendations?: string[];
  analyzed_at: string;
}

export interface Call {
  id: number;
  elderly_id: number;
  call_type: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
  status: string;
  is_successful: boolean;
  messages?: ChatMessage[];
  analysis?: CallAnalysis;
  created_at: string;
}
