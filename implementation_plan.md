# AI Project Feature Enhancements

Currently, your Nova Therapy app is an impressive demonstration of integrating external APIs (Deepgram for STT, Gemini for LLM, ElevenLabs for TTS). However, to present this rigorously as an "AI Engineering" project for a university, portfolio, or hackathon, we need to move beyond simply passing text back and forth to an API.

We need to demonstrate that you understand and have implemented core AI concepts like **Vector Embeddings**, **Classification**, **RAG (Retrieval-Augmented Generation)**, or **Data Extraction**. 

Here are three high-impact features you can implement into this codebase, ranked by visual impact and technical impressiveness.

---

## Option 1: RAG-based Infinite Semantic Memory (Vector Database)

Currently, your memory system summarizes the conversation into a JSON file periodically. That is good, but standard. 
A true AI Engineer approach is to implement a **Retrieval-Augmented Generation (RAG)** pipeline.

**How it works:**
1. **Embeddings:** Whenever a user sends messages, we run their text through an Embedding Model (like Gemini's `text-embedding-004`). This converts the user's thoughts into a mathematical vector (e.g., an array of 768 numbers).
2. **Vector DB:** We store these vectors in a new Supabase table using the **`pgvector`** PostgreSQL extension.
3. **Semantic Search:** When the user asks the AI a question like *"When was the last time I felt this stressed about my boss?"*, the system embeds this question, performs a **Cosine-Similarity Search** across the vector database, and pulls out exact quotes/summaries from conversations months ago.
4. **Context Injection:** The AI reads those past matches and responds.

**Why it’s impressive:** You get to talk about Vector Databases, Cosine Similarity, Embeddings, and the RAG architecture during your presentation.

---

## Option 2: Emotional Sentiment Tracking Dashboard 

Instead of just responding, the AI analyzes the *subtext* of the conversation and generates data visualizations.

**How it works:**
1. **Classification:** Every 5 messages, a background worker runs the conversation snippet through an NLP classification prompt (or a local HuggingFace transformer model).
2. **Scoring:** The AI scores the user's current state across 4 pillars: *Joy, Anxiety, Sadness, Anger* (scale 1-100).
3. **Data Visualization:** We build a "Insights" Dashboard in Next.js using `Recharts` or `Chart.js`. 
4. **Outcome:** When presenting, you show a beautiful graph of the user's emotional journey over time. 

**Why it’s impressive:** It demonstrates "Multi-Task AI". You aren't just building a chatbot; you are using NLP for data extraction, metrics tracking, and health outcomes. It looks incredibly professional.

---

## Option 3: Real-Time Cognitive Distortion Detector

Since this is a therapy app, we can apply AI to a specific clinical psychology concept.

**How it works:** 
1. When the user sends a text, we do a rapid background pass to classify if the text contains a "Cognitive Distortion" (e.g., *Catastrophizing*, *Black-and-White Thinking*, *Mind-Reading*).
2. In the UI, if the user types: *"My manager didn't reply to my slack, I'm definitely getting fired"*, the text bubble gets a subtle red underline or a small tooltip badge that says: **🔍 Mind-Reading detected**.
3. The UI provides a button to "AI Reframe", where the AI suggests a healthier way to phrase the thought.

**Why it’s impressive:** It shows "Domain Adaptation" and AI Safety/Moderation concepts. You modified the AI's utility to serve a specific psychological framework rather than just having a generic chat.

---

> [!IMPORTANT]
> **User Review Required**
> Which of these options sounds the most interesting or suitable for your presentation? I can write the full code for any of these (including setting up the Supabase database migrations, writing the AI prompts, and building the UI). Let me know your preference!
