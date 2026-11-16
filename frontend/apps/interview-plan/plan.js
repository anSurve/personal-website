// The 16-week Big Tech AI / Forward Deployed Engineer plan. Each week lists
// its days Sunday -> Saturday; day ids are "w<week>-<sun|mon|...>" and must
// match PLAN_ITEMS in backend/src/functions/progress.py.
window.FDE_PLAN = {
  title: "16-Week Plan: Big Tech AI / Forward Deployed Engineer",
  start: [2026, 10, 15], // Sun Nov 15, 2026 (month is 0-based)

  howTo: [
    "<b>Time budget:</b> weekdays ~1.5 h (45 min LeetCode + 45 min learning/building); weekends 2–4 h of project work. About 10–12 h/week.",
    "<b>LC ×2</b> = two LeetCode problems from that week's pattern (NeetCode 150 order works well). Watch the solution if stuck &gt;25 min, then redo it 3 days later.",
    "Tick days as you go. If you fall behind, <b>skip LC on a day, never the project blocks</b>, because projects are what make your resume stand out.",
    "<b>Never use employer (Citi/Synechron) code or data</b> in public projects; rebuild the ideas on public datasets.",
    "Holidays (Thanksgiving, Christmas, New Year) are already lighter days.",
  ],

  phases: [
    { name: "AI foundations + 2 portfolio projects", from: 1, to: 6, outcome: "2 deployed projects with evals, 3 LinkedIn posts" },
    { name: "Positioning", from: 7, to: 8, outcome: "New resume, LinkedIn, target list, referral contacts" },
    { name: "Interview prep", from: 9, to: 9, outcome: "LLM system design, STAR stories, first mock interview" },
    { name: "Apply in 3 waves", from: 10, to: 12, outcome: "Practice companies → Databricks/Palantir/hyperscalers → AI labs" },
    { name: "Interview loops", from: 13, to: 14, outcome: "Final rounds" },
    { name: "Offers + H-1B transfer", from: 15, to: 16, outcome: "Signed offer, transfer filed" },
  ],

  weeks: [
    {
      title: "LLM APIs, tool use, embeddings", tag: "Phase 1 · AI foundations", lc: "Arrays & Hashing",
      days: [
        "Setup: create GitHub repo ai-portfolio, Python env, LLM API keys (Anthropic + OpenAI). Read 4 FDE/AI Engineer JDs (OpenAI, Databricks, Palantir, Google Cloud) and list the skills they repeat. Create your job-search tracker. (3h)",
        "LLM basics: tokens, context window, temperature, system prompts. Make your first API calls (normal + streaming). LC ×2.",
        "Structured output (JSON schema) + prompt-engineering basics: clear instructions, examples, XML tags. LC ×2.",
        "Tool use / function calling: give the model a tool that queries a SQLite DB. LC ×2.",
        "Embeddings + vector similarity; store and search vectors in Chroma or pgvector. LC ×2.",
        "Light day: read Anthropic's \"Building effective agents\" and OpenAI's agent guide; write 1 page of notes. LC ×1.",
        "Build a mini-RAG over ~20 public docs end to end (ingest → chunk → embed → retrieve → answer with citations). Push to GitHub. (4h)",
      ],
    },
    {
      title: "RAG depth, evals, observability (Thanksgiving week)", tag: "Phase 1 · AI foundations", lc: "Two Pointers",
      days: [
        "Improve mini-RAG: chunking strategies, hybrid search (BM25 + vector), reranking. Compare before/after. (3h)",
        "Evals 101: write a 30-question eval set for mini-RAG; measure retrieval recall@k. LC ×2.",
        "LLM-as-judge for answer faithfulness; save scores to CSV so you can compare runs. LC ×2.",
        "Observability: add tracing (Langfuse or OpenTelemetry) and log latency + token cost per request. LC ×2.",
        "Thanksgiving: rest. Optional LC ×1.",
        "Cost & speed: prompt caching, batching, choosing small vs large models. Write notes. LC ×1.",
        "Write post #1: \"What I learned building and evaluating a RAG system\" (GitHub README + LinkedIn). (3h)",
      ],
    },
    {
      title: "Superset NL→SQL agent: design + MVP", tag: "Phase 1 · Project 1", lc: "Sliding Window",
      days: [
        "Design doc for Project 1: Superset + agent + semantic layer + SQL guardrails. Use a PUBLIC dataset (e.g., Lending Club loans) in Postgres, never employer code or data. Load the data. (3h)",
        "Schema-introspection tool + table/column descriptions (a small semantic layer). LC ×2.",
        "NL→SQL with tool use; read-only DB user; validate SQL with sqlglot before running. LC ×2.",
        "Self-correction loop: run query → catch error → let the model fix it → retry (max 3). LC ×2.",
        "Superset REST API: create a chart from the agent's result. LC ×2.",
        "Light day: review the week, fix bugs. LC ×1.",
        "Simple chat UI (Streamlit) → full demo: question → SQL → chart in Superset. (4h)",
      ],
    },
    {
      title: "Hardening: evals, guardrails, deployment", tag: "Phase 1 · Project 1", lc: "Stack + Binary Search",
      days: [
        "Eval set: 50 questions with gold SQL; metric = execution accuracy. Record the baseline. (3h)",
        "Improve: few-shot examples + retrieve only relevant tables. Re-run evals and note the gain. LC ×2.",
        "Guardrails: row limits, PII column masking, permission checks, query timeouts. LC ×2.",
        "Deploy: Dockerize; host on AWS/Render/Fly. LC ×2.",
        "Cost/latency table: compare 2–3 models on accuracy vs cost vs speed. LC ×2.",
        "README: architecture diagram, eval numbers, tradeoffs, what you'd do next. LC ×1.",
        "Record a 3-min demo video; LinkedIn post #2 with the eval results. (3h)",
      ],
    },
    {
      title: "Health-info agent + MCP", tag: "Phase 1 · Project 2", lc: "Linked List + Trees",
      days: [
        "Design Project 2: patient-facing Q&A that answers only from trusted public sources (MedlinePlus, PubMed abstracts), always cites, never diagnoses or doses. Ingest data. (3h)",
        "Retrieval with citations: every claim must point to a source chunk. LC ×2.",
        "Safety layer: classify queries (emergency → call 911; dosing → pharmacist/doctor). Red-team with 30 tricky prompts. LC ×2.",
        "Build an MCP server that exposes the knowledge base as a tool; connect it to an MCP client. LC ×2.",
        "Evals: faithfulness, citation correctness, safety pass rate. LC ×2.",
        "README + architecture diagram. LC ×1.",
        "Deploy + demo video; LinkedIn post #3. (3h)",
      ],
    },
    {
      title: "Agents, security, wrap-up (Christmas week)", tag: "Phase 1 · Agents & security", lc: "Trees (BFS/DFS)",
      days: [
        "Multi-step agent in Project 1: plan → act loop, tool errors, human approval before creating dashboards. (3h)",
        "Compare agent frameworks (LangGraph, OpenAI Agents SDK, Claude Agent SDK); port one flow to one of them. LC ×2.",
        "When to fine-tune vs RAG vs prompt: write a 1-page decision guide (great interview material). LC ×2.",
        "Security: prompt injection, data exfiltration, least privilege. Add injection tests to both projects. LC ×1.",
        "Christmas Eve: light / family. Optional LC ×1.",
        "Christmas: rest.",
        "Phase 1 retro: GitHub profile README pinning both projects + demo links. (2h)",
      ],
    },
    {
      title: "Resume + LinkedIn (New Year week)", tag: "Phase 2 · Positioning", lc: "Graphs",
      days: [
        "Resume v3: 3-line summary (\"Senior Data & AI Engineer, 10 yrs delivering enterprise data + GenAI systems\"), AI Projects section near the top, Citi credit-risk platform first. (3h)",
        "Rewrite Citi + Accenture bullets: add baselines (\"45 → 15 min\"), scale, and client-facing work. LC ×2.",
        "Cut Tech Mahindra/Siebel to 2 lines; skills: Python, SQL, PySpark, LLM APIs, RAG, agents, evals, MCP, AWS, Docker. Spell out the M.Sc. LC ×2.",
        "LinkedIn: headline, About, Featured (projects + posts), \"Open to work\" visible to recruiters only. LC ×2.",
        "New Year's Eve: light. LC ×1.",
        "New Year's Day: rest.",
        "Resume review: ask 2 people at big tech for feedback; check keywords against 5 JDs. (2h)",
      ],
    },
    {
      title: "Target list, referrals, system design start", tag: "Phase 2 · Positioning", lc: "Heaps + Intervals",
      days: [
        "Target tracker: ~30 companies in 3 tiers (see appendix). For each: role link, NYC office, H-1B transfer support, referral contact. (3h)",
        "Find 15 referral contacts (ex-Accenture, Tech Mahindra, Synechron, LJMU alumni at target companies). Send 5 messages. LC ×2.",
        "System design basics: scaling, caching, queues, DB choices (DDIA ch. 1–3 or ByteByteGo). LC ×2.",
        "Send 5 more referral messages. LC ×2.",
        "SD practice out loud (45 min): design a multi-source data ingestion platform, which is your home turf. LC ×2.",
        "Send 5 more messages + follow-ups. LC ×1.",
        "SD: rate limiter + URL shortener; write up both. (3h)",
      ],
    },
    {
      title: "LLM system design, behavioral stories", tag: "Phase 3 · Interview prep", lc: "1-D DP",
      days: [
        "LLM SD: enterprise RAG over 1M documents with permission-aware retrieval, freshness, and evals. (3h)",
        "Reading: vector DB internals (HNSW, filtering). LC ×2.",
        "LLM SD: customer-support agent with tools, escalation, and evals. LC ×2.",
        "Write 6 STAR stories: CDH→CDP migration, MTTR reduction, ticket-routing automation, ambiguous client requirement, stakeholder conflict, production incident. LC ×2.",
        "FDE case practice (30 min, out loud): \"A bank wants an LLM to summarize credit memos.\" Ask questions, scope, design, define success metrics. LC ×2.",
        "Rehearse stories. LC ×1.",
        "Mock interview #1: coding (interviewing.io / Pramp / friend). (2h)",
      ],
    },
    {
      title: "Wave 1: practice companies", tag: "Phase 4 · Apply", lc: "2-D DP + Backtracking",
      days: [
        "Apply to ~8 Tier-3 \"practice\" companies with a tailored resume. (3h)",
        "FDE case: \"A hospital wants AI triage of patient messages.\" LC ×2.",
        "LLM SD: an eval + observability platform for LLM apps. LC ×2.",
        "Answers for \"Why FDE?\", \"Why this company?\", \"Tell me about yourself\" (90 sec). Behavioral mock with a friend. LC ×2.",
        "SD: real-time analytics/BI platform (Superset-like). LC ×2.",
        "Follow up on applications + referrals. LC ×1.",
        "Mock interview #2: system design. (2h)",
      ],
    },
    {
      title: "Wave 2: Databricks, Palantir, hyperscalers", tag: "Phase 4 · Apply", lc: "Greedy + Tries",
      days: [
        "Apply via referrals: Databricks, Palantir, Google Cloud, AWS, Microsoft, Salesforce, Snowflake. (3h)",
        "Palantir prep: decomposition + learning interviews; practice breaking down a vague problem out loud. LC ×2.",
        "Databricks prep: Spark internals refresh, Delta Lake, their GenAI/agent tooling. LC ×2.",
        "One-page research note for every active process (product, customers, recent news). LC ×2.",
        "FDE role-play: a friend plays a confused customer; you run discovery. LC ×2.",
        "Recruiter-call script incl. \"Do you support H-1B transfers?\" LC ×1.",
        "Mock interview #3: full loop (coding + SD + behavioral). (3h)",
      ],
    },
    {
      title: "Wave 3: AI labs and AI-native companies", tag: "Phase 4 · Apply", lc: "Mixed review",
      days: [
        "Apply to OpenAI, Anthropic, Scale AI, Sierra, and similar, with project links + a 3-line note. (3h)",
        "Redo every LC problem you failed so far (×2). Interviews as scheduled.",
        "Deep dive into target labs' API docs + cookbooks. LC ×2.",
        "Build a small demo on one target company's API to mention in interviews. LC ×2.",
        "SD rapid-fire: 3 designs × 20 min. LC ×2.",
        "Update tracker; follow-ups. LC ×1.",
        "Mock interview #4. (2h)",
      ],
    },
    {
      title: "Screens + technical rounds", tag: "Phase 5 · Interview loops", lc: "Review (redo failures)",
      days: [
        "Weekly planning: list interviews this week; prepare company-specific notes. (2h)",
        "LC ×2 + prep for the next scheduled round.",
        "LLM SD rehearsal (one design, 45 min). LC ×1.",
        "Behavioral: rehearse 3 stories tailored to this week's companies. LC ×2.",
        "FDE case rehearsal (30 min). LC ×1.",
        "After each interview: write what was asked + what to improve. Light day.",
        "Mock interview #5 on your weakest area. (2h)",
      ],
    },
    {
      title: "Onsites / final rounds", tag: "Phase 5 · Interview loops", lc: "Timed mocks",
      days: [
        "Review all post-interview notes; fix the top 3 weak spots. (2h)",
        "Timed LC (2 problems in 45 min). Final-round prep.",
        "System design refresh: your 2 best designs, end to end. LC ×1.",
        "Prepare thoughtful questions for each interviewer; walk through project demos. LC ×1.",
        "Light day: rest before onsites.",
        "Thank-you notes; update tracker.",
        "Weekly retro; keep 1–2 earlier-stage processes moving as backup. (2h)",
      ],
    },
    {
      title: "Offers + negotiation", tag: "Phase 6 · Offers", lc: "Maintenance (1/day)",
      days: [
        "Research levels and pay for each company (levels.fyi); write your target and walk-away numbers. (2h)",
        "Ask each recruiter for timelines; tell others you have offers in progress, so they can speed up. LC ×1.",
        "Get in writing: level, base/bonus/equity, start date, H-1B transfer filing, green card (PERM) policy and timing. LC ×1.",
        "Negotiate: use competing offers, be polite and specific. LC ×1.",
        "Consult an immigration attorney on transfer timing before giving notice.",
        "Light day.",
        "Decide using criteria you wrote earlier: role fit, growth, comp, green card support, commute. (2h)",
      ],
    },
    {
      title: "Accept, transfer, transition", tag: "Phase 6 · Decision", lc: "—",
      days: [
        "Accept the offer; send onboarding documents. (1h)",
        "New employer files the H-1B transfer (from inside the US). Keep copies of pay stubs + I-797.",
        "Give notice only on your attorney's advice (typically after the transfer receipt). Plan a clean handover.",
        "Thank referrers and interviewers; politely close other processes.",
        "Write a 30/60/90-day plan for the new role.",
        "Light day.",
        "Retro on the whole search; save notes for the future. Celebrate. 🎉",
      ],
    },
  ],

  // Appendix B: tracked like days (ids h1b-1 .. h1b-5)
  h1b: [
    "Ask in the first recruiter call: \"Do you support H-1B transfers?\"",
    "Transfers (change of employer) filed while you're inside the US are exempt from the $100K H-1B fee. That fee was also vacated by a federal court in June 2026, with an appeal pending, so re-check before filing.",
    "Keep recent pay stubs, I-797, and I-94 ready for the new employer.",
    "Don't resign until your immigration attorney confirms the timing.",
    "Ask about green card (PERM) sponsorship policy and timing before accepting.",
  ],

  targets: [
    { tier: "Tier 1 (stretch)", list: "OpenAI (FDE), Anthropic (Applied AI / FDE), Scale AI, Sierra, Cursor" },
    { tier: "Tier 2 (best fit)", list: "Databricks (AI / customer-facing engineer), Palantir (FDSE, NYC office), Google Cloud, AWS, Microsoft, Salesforce (Agentforce FDE), Snowflake" },
    { tier: "Tier 3 (practice)", list: "Well-funded AI startups and enterprise-AI firms with NYC offices" },
  ],

  resources: [
    { k: "Coding", v: "NeetCode 150 (LeetCode)" },
    { k: "System design", v: "Designing Data-Intensive Applications (Kleppmann), ByteByteGo" },
    { k: "LLM engineering", v: "Anthropic and OpenAI docs + cookbooks; Anthropic's \"Building effective agents\"; Model Context Protocol docs" },
    { k: "Mock interviews", v: "interviewing.io, Pramp, ex-colleagues" },
  ],

  review: [
    "What did I finish? What slipped? What will I cut or move next week?",
    "Number of referral messages sent / applications / interviews this week",
  ],
};
