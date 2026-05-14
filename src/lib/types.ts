export type Role = "teacher" | "parent";

export type DocumentType = "worksheet" | "lesson_plan" | "support_document";
export type OutputKind = "modified" | "regenerated" | "support_document";
export type DocumentStatus = "processing" | "ready" | "error";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  created_at: string;
}

/** Structured EHCP needs extracted by Claude from the uploaded plan. */
export interface EhcpSummary {
  primary_needs: string[];
  communication: string;
  cognition_and_learning: string;
  social_emotional_mental_health: string;
  sensory_and_physical: string;
  recommended_strategies: string[];
  key_outcomes: string[];
}

/** Answers from the onboarding quiz. */
export interface QuizResults {
  communication_style: string;
  engagement_triggers: string;
  sensory_considerations: string;
  reading_age_estimate: string;
  emotional_regulation: string;
  interests: string;
  things_to_avoid: string;
}

/** A profile that grows from feedback on generated documents. */
export interface LearningProfile {
  summary: string;
  what_works: string[];
  what_to_avoid: string[];
  updated_at: string;
}

export interface Child {
  id: string;
  name: string;
  age: number | null;
  year_group: string | null;
  ehcp_text: string | null;
  ehcp_summary: EhcpSummary | null;
  quiz_results: QuizResults | null;
  learning_profile: LearningProfile | null;
  created_by: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  child_id: string;
  uploaded_by: string | null;
  title: string | null;
  original_filename: string | null;
  original_file_url: string | null;
  original_text: string | null;
  output_file_url: string | null;
  output_text: string | null;
  document_type: DocumentType | null;
  output_kind: OutputKind | null;
  adaptation_notes: string | null;
  parent_document_id: string | null;
  status: DocumentStatus;
  error_message: string | null;
  feedback_score: number | null;
  feedback_note: string | null;
  feedback_by: string | null;
  feedback_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  child_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Invite {
  id: string;
  child_id: string;
  email: string;
  token: string;
  role: Role;
  invited_by: string | null;
  accepted: boolean;
  created_at: string;
}

export interface ChildMember {
  id: string;
  child_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}
