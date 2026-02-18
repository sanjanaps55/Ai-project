export const APP_NAME = "MindCare AI";

export const TAGLINE = "Your Intelligent Emotional Companion";

export const SIDEBAR_LINKS = [
  { name: "Chat", path: "/chat" },
  { name: "Assessments", path: "/assessments" },
  { name: "History", path: "/history" },
];

export const ASSESSMENTS = [
  {
    title: "Relationship Manager",
    description: "Improve emotional communication and understanding.",
  },
  {
    title: "Stress Manager",
    description: "Manage stress using guided techniques.",
  },
  {
    title: "Self-Reflection Exercises",
    description: "Deep personal growth prompts.",
  },
];

export const MOCK_MESSAGES = [
  { role: "user", content: "I feel overwhelmed today." },
  {
    role: "ai",
    content: "I'm here for you. Would you like to talk about it?",
  },
];

export const MOCK_HISTORY = [
  { date: "March 12, 2026", summary: "Discussed academic stress." },
  { date: "March 10, 2026", summary: "Talked about relationship anxiety." },
];

export type ChatRole = "user" | "ai";


