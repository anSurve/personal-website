// Detailed day guides for Week 1 of the plan (LLM APIs, tool use, embeddings).
// Keyed by day id (see plan.js). Each guide has:
//   goal        one-line outcome for the day
//   objectives  checklist items { t: text, tip?: text } -> ids "<day>-o1", "-o2", …
//               (must stay within the o1..o19 range allowed by progress.py)
//   learn       short lessons { h: heading, html }
//   code        runnable files { title, lang, src }
//   leetcode    { name, url, level, hint }
//   resources   { t, url }
//   done        what "finished" looks like
//   interview   one question to practise answering out loud
// Code samples use the Anthropic Python SDK and were checked against it.
window.FDE_CONTENT = Object.assign(window.FDE_CONTENT || {}, {

  // ---------------------------------------------------------------- Sun
  "w1-sun": {
    goal: "A repo you'll build in for 16 weeks, working API keys, and a clear picture of what the target roles ask for.",
    objectives: [
      { t: "Create a public GitHub repo ai-portfolio (README, Python .gitignore, MIT license) and clone it.", tip: "This repo becomes your portfolio. Every day's work in Weeks 1–6 lands here, so commit often with clear messages." },
      { t: "Create a Python 3.12+ virtual environment and install anthropic, openai, python-dotenv.", tip: "Use the setup commands below. Keep a requirements.txt from day one." },
      { t: "Create Anthropic and OpenAI API keys, save them in .env, and set a monthly spend limit on both accounts.", tip: "A $20–30 limit is plenty for these 6 weeks. Never commit .env: it's in .gitignore below." },
      { t: "Run smoke_test.py, then make your first commit and push.", tip: "If it prints a sentence and a token count, your key, SDK and network all work." },
      { t: "Read 4 FDE / AI Engineer job descriptions (OpenAI, Databricks, Palantir, Google Cloud) and fill in the skills matrix.", tip: "Save each JD as a .txt file in jds/. You'll extract them automatically with Claude on Tuesday." },
      { t: "Create your job-search tracker (Google Sheets or Notion) with the columns below.", tip: "You'll fill it properly in Week 8; today just set up the structure and add the 4 companies you read about." },
    ],
    learn: [
      { h: "What a Forward Deployed Engineer actually does", html: `<p>An FDE (also called Applied AI Engineer or Forward Deployed Software Engineer) sits between a product and a customer. The job is to turn a platform into something that works on <em>that customer's</em> data and systems: run discovery with stakeholders, scope a vague problem, build a working prototype, deploy it into their environment, measure it, and feed product gaps back to the core team.</p><p>Interviews usually test three things: <b>coding</b> (LeetCode-style plus practical Python), <b>system design</b> (increasingly LLM system design), and <b>customer judgment</b> (decomposing an ambiguous problem out loud). Your data-engineering and client-delivery background already covers the third; Weeks 1–6 close the gap on hands-on LLM application skills.</p>` },
      { h: "Reading a job description like an engineer", html: `<ul><li>Split each requirement into <b>must-have</b> and <b>nice-to-have</b>.</li><li>Count repeats across companies: those are the skills to prove with projects.</li><li>Note the verbs: "deploy", "own", "work directly with customers", "travel". They tell you which STAR stories to prepare (Week 9).</li><li>Map each skill to the week of this plan that covers it, so you know the plan closes your gaps.</li></ul><p>Skills that usually repeat: Python, SQL, LLM APIs, RAG, evaluation, agents / tool use, deploying to cloud, and communicating with non-technical stakeholders.</p>` },
      { h: "Keeping keys safe", html: `<ul><li>Keys live only in <code>.env</code> (loaded with python-dotenv) or your shell environment, never in code.</li><li>Commit a <code>.env.example</code> with empty values so others know what's needed.</li><li>If a key ever lands in git history, <b>revoke it immediately</b> in the console; deleting the commit isn't enough.</li><li>Spend limits turn a runaway loop into a small bill instead of a big one.</li></ul>` },
    ],
    code: [
      { title: "Setup (macOS / Linux)", lang: "bash", src: String.raw`git clone https://github.com/<your-username>/ai-portfolio.git
cd ai-portfolio
python3 -m venv .venv && source .venv/bin/activate
pip install anthropic openai python-dotenv
pip freeze > requirements.txt` },
      { title: "Setup (Windows PowerShell)", lang: "powershell", src: String.raw`git clone https://github.com/<your-username>/ai-portfolio.git
cd ai-portfolio
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install anthropic openai python-dotenv
pip freeze > requirements.txt

# Make Python print Unicode (model output, Wikipedia text) without crashing.
# Run once, then open a new terminal.
[Environment]::SetEnvironmentVariable("PYTHONUTF8", "1", "User")` },
      { title: ".env  (never commit this file)", lang: "text", src: String.raw`ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...` },
      { title: "Add to .gitignore", lang: "text", src: String.raw`.env
.venv/
__pycache__/
chroma_db/
data/
*.db` },
      { title: "smoke_test.py", lang: "python", src: String.raw`"""Day 1 smoke test: confirms your Anthropic key, SDK and network all work."""
import anthropic
from dotenv import load_dotenv

load_dotenv()  # reads ANTHROPIC_API_KEY from .env
client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "In one sentence, what does a Forward Deployed Engineer do?"}],
)
print(next(b.text for b in response.content if b.type == "text"))
print(f"tokens in/out: {response.usage.input_tokens}/{response.usage.output_tokens}")` },
      { title: "Skills matrix (skills.md)", lang: "markdown", src: String.raw`| Skill                        | OpenAI | Databricks | Palantir | Google Cloud | Plan week |
|------------------------------|:------:|:----------:|:--------:|:------------:|:---------:|
| Python                       |        |            |          |              | 1–6       |
| LLM APIs / prompting         |        |            |          |              | 1         |
| RAG / retrieval              |        |            |          |              | 1–2, 5    |
| Evals                        |        |            |          |              | 2, 4, 5   |
| Agents / tool use            |        |            |          |              | 1, 3, 6   |
| SQL / data engineering       |        |            |          |              | 3–4       |
| Cloud deploy / Docker        |        |            |          |              | 4         |
| Customer-facing / discovery  |        |            |          |              | 9–11      |
| Travel / on-site             |        |            |          |              | —         |` },
      { title: "Job tracker columns", lang: "text", src: String.raw`Company | Tier (1/2/3) | Role | Link | NYC office? | H-1B transfer? | Referral contact | Status | Applied on | Next step | Notes` },
    ],
    resources: [
      { t: "Claude API: get started", url: "https://platform.claude.com/docs/en/get-started" },
      { t: "Claude Console (create an API key, set limits)", url: "https://platform.claude.com/" },
      { t: "OpenAI API quickstart", url: "https://platform.openai.com/docs/quickstart" },
      { t: "GitHub's Python .gitignore template", url: "https://github.com/github/gitignore/blob/main/Python.gitignore" },
      { t: "OpenAI careers", url: "https://openai.com/careers/" },
      { t: "Databricks careers", url: "https://www.databricks.com/company/careers" },
      { t: "Palantir careers", url: "https://www.palantir.com/careers/" },
      { t: "Google careers (search \"forward deployed\")", url: "https://www.google.com/about/careers/applications/jobs/results/" },
    ],
    done: "ai-portfolio is on GitHub with a README and smoke_test.py; skills.md has 4 columns filled in; the tracker exists with 4 rows.",
    interview: "\"Why do you want to be a Forward Deployed Engineer rather than a backend engineer?\" Draft a 3-sentence answer now; you'll refine it in Week 10.",
  },

  // ---------------------------------------------------------------- Mon
  "w1-mon": {
    goal: "Understand tokens, context windows, sampling and system prompts, and make your first normal and streaming calls.",
    objectives: [
      { t: "Read the Learn section below and the Claude \"Working with messages\" guide.", tip: "~20 minutes. Focus on: the API is stateless, and every request carries the whole conversation." },
      { t: "Count tokens for a short and a long prompt with count_tokens; note characters per token.", tip: "Run section 1 of basics.py. A rule of thumb for English is ~4 characters per token, but always measure." },
      { t: "Make a call with a system prompt, then change the system prompt and compare the answers.", tip: "Section 2. Try a \"senior interviewer\" persona vs a \"friendly tutor\" persona on the same question." },
      { t: "Stream a response and measure time-to-first-token vs total time.", tip: "Section 3. This gap is why chat UIs stream: users see text in about a second instead of waiting for the whole answer." },
      { t: "Compare effort \"low\" vs \"high\" on one reasoning question and record tokens, latency and quality in notes.md.", tip: "Section 4. Effort is the main cost/quality dial on current Claude models." },
      { t: "LeetCode: Contains Duplicate and Valid Anagram." },
    ],
    learn: [
      { h: "Tokens", html: `<p>Models read and write <b>tokens</b>: sub-word pieces, not characters or words. Pricing, rate limits, context windows and <code>max_tokens</code> are all measured in tokens. Different models use different tokenizers, so count with the provider's API (<code>client.messages.count_tokens</code>) rather than guessing.</p>` },
      { h: "Context window", html: `<p>The context window is the total number of tokens a model can work with in one request: system prompt + conversation + tool definitions + its own output. Current Claude models have a 1M-token window. A bigger window isn't free: every token you send costs money and adds latency, and models still find needles more reliably in short, relevant contexts. That's why retrieval (Saturday) still matters.</p><p>The Messages API is <b>stateless</b>: to continue a conversation you resend the earlier turns yourself.</p>` },
      { h: "System prompts", html: `<p>The <code>system</code> parameter sets the role, rules and output style; the <code>user</code> messages carry the task and data. Put stable instructions in the system prompt: they apply to every turn and can be cached (Week 2).</p>` },
      { h: "Temperature, sampling and effort", html: `<p><b>Temperature</b> controls how random the next-token choice is: low means more deterministic, high means more varied. Know the concept for interviews, and you'll still see it on many APIs.</p><p><b>On current Claude models, sampling parameters are gone:</b> sending <code>temperature</code> or <code>top_p</code> to <code>claude-opus-5-5</code> returns a 400 error. You steer them with clearer prompts, examples, structured outputs (Tuesday) and <b>effort</b>. Claude Opus 5.5 always thinks adaptively before answering, and <code>output_config={"effort": ...}</code> (<code>low</code>, <code>medium</code> (the default), <code>high</code>, <code>xhigh</code>, <code>max</code>) sets how much it thinks and how many tokens it spends.</p>` },
      { h: "Streaming", html: `<p>Streaming returns text as it's generated. Use it for anything user-facing and for long outputs; non-streaming requests with very large <code>max_tokens</code> can hit HTTP timeouts. The SDK's <code>messages.stream()</code> helper gives you <code>text_stream</code> and <code>get_final_message()</code> (with the usage numbers) at the end.</p>` },
    ],
    code: [
      { title: "basics.py", lang: "python", src: String.raw`"""Day 2: tokens, system prompts, streaming and effort with the Claude API."""
import time

import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()
MODEL = "claude-opus-5-5"


def text_of(response) -> str:
    return next((b.text for b in response.content if b.type == "text"), "")


# 1. Tokens: measure, don't guess
for prompt in ["Hello!", "Explain retrieval-augmented generation. " * 50]:
    count = client.messages.count_tokens(model=MODEL, messages=[{"role": "user", "content": prompt}])
    print(f"{len(prompt):>5} chars -> {count.input_tokens:>4} tokens")

# 2. System prompts change behaviour without changing the question
question = "What is a context window?"
for system in [
    "You are a senior interviewer at an AI company. Answer in two crisp sentences.",
    "You are a friendly tutor for a beginner. Use an everyday analogy.",
]:
    response = client.messages.create(
        model=MODEL, max_tokens=1024, system=system,
        messages=[{"role": "user", "content": question}],
    )
    print(f"\n[{system[:40]}...]\n{text_of(response)}")

# 3. Streaming: time to first token vs total time
start, first = time.perf_counter(), None
with client.messages.stream(
    model=MODEL, max_tokens=64000,
    messages=[{"role": "user", "content": "List 5 uses of LLMs in banking, one line each."}],
) as stream:
    for text in stream.text_stream:
        if first is None:
            first = time.perf_counter() - start
        print(text, end="", flush=True)
    final = stream.get_final_message()
print(f"\nfirst token {first:.2f}s, total {time.perf_counter() - start:.2f}s, output tokens {final.usage.output_tokens}")

# 4. Effort: how hard the model thinks (and how many tokens it spends)
puzzle = "A bat and a ball cost $1.10. The bat costs $1.00 more than the ball. What does the ball cost? Answer in one line."
for effort in ["low", "high"]:
    start = time.perf_counter()
    response = client.messages.create(
        model=MODEL, max_tokens=16000, output_config={"effort": effort},
        messages=[{"role": "user", "content": puzzle}],
    )
    print(f"\neffort={effort}: {time.perf_counter() - start:.1f}s, "
          f"{response.usage.output_tokens} output tokens -> {text_of(response)}")` },
    ],
    leetcode: [
      { name: "217. Contains Duplicate", url: "https://leetcode.com/problems/contains-duplicate/", level: "Easy", hint: "A set remembers what you've seen; return as soon as you meet a number twice. O(n) time." },
      { name: "242. Valid Anagram", url: "https://leetcode.com/problems/valid-anagram/", level: "Easy", hint: "Compare character counts (Counter or a 26-slot array). Check lengths first." },
    ],
    resources: [
      { t: "Working with the Messages API", url: "https://platform.claude.com/docs/en/build-with-claude/working-with-messages" },
      { t: "Token counting", url: "https://platform.claude.com/docs/en/build-with-claude/token-counting" },
      { t: "Streaming messages", url: "https://platform.claude.com/docs/en/build-with-claude/streaming" },
      { t: "Effort parameter", url: "https://platform.claude.com/docs/en/build-with-claude/effort" },
      { t: "Models overview (context windows, pricing)", url: "https://platform.claude.com/docs/en/about-claude/models/overview" },
      { t: "NeetCode roadmap (problem order)", url: "https://neetcode.io/roadmap" },
    ],
    done: "basics.py runs end to end and is committed; notes.md has your token, streaming and effort measurements; 2 LeetCode problems solved.",
    interview: "\"Models now have 1M-token context windows. Why would you still build retrieval?\" (Cost, latency, accuracy on long contexts, freshness, permissions.)",
  },

  // ---------------------------------------------------------------- Tue
  "w1-tue": {
    goal: "Get reliable, schema-valid JSON out of a model, and learn the prompt-engineering basics that make outputs good.",
    objectives: [
      { t: "Read the prompt-engineering basics: be clear and direct, use examples, use XML tags.", tip: "Links below; ~25 minutes. Skim, then come back to them when a prompt misbehaves." },
      { t: "Define a JobPosting Pydantic model and extract it from one JD with messages.parse.", tip: "Run extract_jd.py on a single file first and read the output critically: is anything invented?" },
      { t: "Run the extraction over all 4 JDs from Sunday and save jds.json plus a skill frequency count.", tip: "The script prints the skills that appear most often: compare them with your hand-made matrix." },
      { t: "Add 2 short examples and XML tags to the prompt; compare quality on the trickiest JD.", tip: "Look especially at must-have vs nice-to-have: that split is where models slip." },
      { t: "LeetCode: Two Sum and Group Anagrams." },
    ],
    learn: [
      { h: "Why structured outputs", html: `<p>"Please reply in JSON" works most of the time, which isn't good enough for code that parses the result. <b>Structured outputs</b> constrain generation to your JSON schema, so the response always parses and validates. In Python, <code>client.messages.parse(..., output_format=MyModel)</code> takes a Pydantic model and gives you back a validated instance in <code>response.parsed_output</code>. Under the hood this is <code>output_config.format</code> with a JSON schema.</p><p>Design schemas for honesty: make fields nullable (<code>str | None</code>) and tell the model to use null when something isn't stated. Otherwise a required field invites it to invent a value.</p>` },
      { h: "Prompt-engineering basics that matter most", html: `<ul><li><b>Be clear and direct.</b> Say what the output is for, who reads it, and what good looks like. Imagine handing the prompt to a smart new colleague with no context.</li><li><b>Separate instructions from data with XML tags</b>, e.g. <code>&lt;job_description&gt;…&lt;/job_description&gt;</code>. It reduces confusion and is a first defence against prompt injection hidden inside documents (Week 6).</li><li><b>Show examples.</b> 1–3 short input → output examples fix formatting and edge cases faster than more rules. Make them varied, so the model doesn't copy one.</li><li><b>Say what to do, not only what not to do</b>, and explain why: models generalise from the reason.</li></ul>` },
    ],
    code: [
      { title: "extract_jd.py", lang: "python", src: String.raw`"""Day 3: structured extraction from job descriptions with Pydantic + messages.parse."""
import json
import pathlib
from collections import Counter

import anthropic
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()
client = anthropic.Anthropic()


class JobPosting(BaseModel):
    company: str
    title: str
    location: str | None = Field(description="City or 'Remote'; null if not stated")
    must_have_skills: list[str] = Field(description="Short skill names, e.g. 'Python', 'RAG', 'SQL'")
    nice_to_have_skills: list[str]
    customer_facing: bool = Field(description="True if the role works directly with customers")
    travel: str | None = Field(description="Travel expectation as written, e.g. '25%'; null if not stated")


SYSTEM = """You extract structured data from job descriptions for a job seeker.
Only use facts stated in the job description. If a field isn't mentioned, use null (or an empty list).
Normalise skill names to short, common forms ("Large language models" -> "LLMs").

<examples>
<example>
Text: "You have 3+ years of Python. Experience with vector databases is a plus."
must_have_skills: ["Python"]; nice_to_have_skills: ["Vector databases"]
</example>
<example>
Text: "Travel to customer sites up to 30% of the time."
travel: "up to 30%"
</example>
</examples>"""


def extract(jd_text: str) -> JobPosting:
    response = client.messages.parse(
        model="claude-opus-5-5",
        max_tokens=16000,
        system=SYSTEM,
        messages=[{
            "role": "user",
            "content": f"<job_description>\n{jd_text}\n</job_description>\n\nExtract the posting details.",
        }],
        output_format=JobPosting,
    )
    return response.parsed_output


if __name__ == "__main__":
    postings = []
    for path in sorted(pathlib.Path("jds").glob("*.txt")):
        posting = extract(path.read_text(encoding="utf-8"))
        postings.append(posting.model_dump())
        print(f"{posting.company}: {posting.title} ({len(posting.must_have_skills)} must-haves)")

    pathlib.Path("jds.json").write_text(json.dumps(postings, indent=2), encoding="utf-8")
    counts = Counter(s.lower() for p in postings for s in p["must_have_skills"] + p["nice_to_have_skills"])
    print("\nMost requested skills:")
    for skill, n in counts.most_common(15):
        print(f"  {n}x {skill}")` },
    ],
    leetcode: [
      { name: "1. Two Sum", url: "https://leetcode.com/problems/two-sum/", level: "Easy", hint: "One pass with a dict of value → index; for each number, check whether target − number is already in it." },
      { name: "49. Group Anagrams", url: "https://leetcode.com/problems/group-anagrams/", level: "Medium", hint: "Group by a key that's identical for anagrams: the sorted string, or a 26-count tuple (faster for long words)." },
    ],
    resources: [
      { t: "Structured outputs", url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs" },
      { t: "Prompt engineering overview", url: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview" },
      { t: "Use XML tags to structure prompts", url: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags" },
      { t: "Use examples (multishot prompting)", url: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/multishot-prompting" },
    ],
    done: "jds.json holds 4 validated postings; the skill frequency list is in notes.md; extract_jd.py is committed.",
    interview: "\"How do you make an LLM's output safe to parse in production?\" (Schema-constrained output, validation, nullable fields, retries, logging failures.)",
  },

  // ---------------------------------------------------------------- Wed
  "w1-wed": {
    goal: "Give a model a tool, here a read-only SQL tool over SQLite, and run the tool-use loop yourself.",
    objectives: [
      { t: "Read how tool use works: tool definitions, tool_use and tool_result blocks, and the loop.", tip: "Key idea: the model never runs anything. It asks; your code executes and reports back." },
      { t: "Create jobs.db with seed_db.py.", tip: "Sample job-search data (applications + interviews). Later in the plan you'll point the same pattern at a real dataset." },
      { t: "Implement the get_schema and run_sql tools, with the database opened read-only.", tip: "Guardrails belong in the tool, not only the prompt: a read-only connection can't be talked into deleting data." },
      { t: "Run the agent loop on the 3 sample questions and read the printed tool calls.", tip: "Notice it usually calls get_schema first, then writes SQL. That's the plan-then-act pattern in miniature." },
      { t: "Ask it to delete or update data, and confirm the tool refuses and the model explains why.", tip: "This is your first guardrail test. Keep the transcript: it's a good README screenshot." },
      { t: "LeetCode: Top K Frequent Elements and Product of Array Except Self." },
    ],
    learn: [
      { h: "How tool use works", html: `<ol><li>You send tool definitions (name, description, JSON schema) with your request.</li><li>If the model wants a tool, the response has <code>stop_reason: "tool_use"</code> and one or more <code>tool_use</code> blocks with arguments.</li><li><b>Your code</b> runs the tool and sends back <code>tool_result</code> blocks (matched by <code>tool_use_id</code>) in a user message. Send all results from one turn together.</li><li>Repeat until the model answers without asking for a tool.</li></ol><p>That loop is the core of every agent. The SDK also has a tool runner that drives it for you; writing it by hand once makes everything later easier to debug.</p>` },
      { h: "Designing tools well", html: `<ul><li><b>Descriptions are prompts.</b> Say what the tool does, when to use it, and what it returns.</li><li><b>Give the model a way to look before it acts</b>: a schema tool beats guessing table names.</li><li><b>Enforce safety in the tool</b> (read-only connection, row limits), not just in instructions.</li><li><b>Return errors as tool results</b> with <code>is_error: true</code>. The model reads the error and usually fixes its own query: you'll build that self-correction loop on purpose in Week 3.</li><li><code>strict: true</code> guarantees the arguments match your schema.</li></ul>` },
    ],
    code: [
      { title: "seed_db.py", lang: "python", src: String.raw`"""Creates jobs.db with sample job-search data for the SQL agent."""
import sqlite3

conn = sqlite3.connect("jobs.db")
conn.executescript("""
DROP TABLE IF EXISTS interviews;
DROP TABLE IF EXISTS applications;
CREATE TABLE applications (
    id INTEGER PRIMARY KEY,
    company TEXT NOT NULL,
    tier INTEGER NOT NULL,          -- 1 stretch, 2 best fit, 3 practice
    role TEXT NOT NULL,
    status TEXT NOT NULL,           -- planned, applied, interviewing, offer, rejected
    applied_on TEXT,                -- ISO date
    has_referral INTEGER NOT NULL   -- 0 or 1
);
CREATE TABLE interviews (
    id INTEGER PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES applications(id),
    round TEXT NOT NULL,            -- recruiter, coding, system design, onsite
    scheduled_on TEXT NOT NULL,
    outcome TEXT                    -- passed, failed, pending
);
""")
conn.executemany(
    "INSERT INTO applications (company, tier, role, status, applied_on, has_referral) VALUES (?, ?, ?, ?, ?, ?)",
    [
        ("Northwind AI", 3, "AI Engineer", "interviewing", "2027-01-17", 0),
        ("Contoso Data", 3, "Solutions Engineer", "rejected", "2027-01-17", 0),
        ("Fabrikam", 3, "Forward Deployed Engineer", "applied", "2027-01-18", 1),
        ("Databricks", 2, "AI Engineer", "interviewing", "2027-01-24", 1),
        ("Palantir", 2, "Forward Deployed Software Engineer", "applied", "2027-01-24", 1),
        ("Snowflake", 2, "Solutions Architect, AI", "applied", "2027-01-25", 0),
        ("Google Cloud", 2, "Customer Engineer, GenAI", "planned", None, 0),
        ("Anthropic", 1, "Applied AI Engineer", "applied", "2027-01-31", 1),
        ("OpenAI", 1, "Forward Deployed Engineer", "planned", None, 0),
    ],
)
conn.executemany(
    "INSERT INTO interviews (application_id, round, scheduled_on, outcome) VALUES (?, ?, ?, ?)",
    [
        (1, "recruiter", "2027-01-22", "passed"),
        (1, "coding", "2027-01-29", "pending"),
        (2, "recruiter", "2027-01-21", "failed"),
        (4, "recruiter", "2027-01-28", "passed"),
        (4, "system design", "2027-02-04", "pending"),
    ],
)
conn.commit()
conn.close()
print("jobs.db created")` },
      { title: "sql_agent.py", lang: "python", src: String.raw`"""Day 4: a tool-using agent that answers questions with read-only SQL."""
import json
import sqlite3
import sys
from contextlib import closing

import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()
DB_URI = "file:jobs.db?mode=ro"  # read-only at the database level


def get_schema() -> str:
    with closing(sqlite3.connect(DB_URI, uri=True)) as conn:
        rows = conn.execute("SELECT sql FROM sqlite_master WHERE type = 'table'").fetchall()
    return "\n\n".join(r[0] for r in rows)


def run_sql(query: str) -> str:
    if not query.lstrip().lower().startswith(("select", "with")):
        raise ValueError("Only read-only SELECT queries are allowed.")
    with closing(sqlite3.connect(DB_URI, uri=True)) as conn:
        cursor = conn.execute(query)
        columns = [d[0] for d in cursor.description]
        rows = cursor.fetchmany(50)
    return json.dumps({"columns": columns, "rows": rows})


TOOLS = [
    {
        "name": "get_schema",
        "description": "Return the CREATE TABLE statements for every table in the job-search database. Call this before writing SQL.",
        "input_schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
        "strict": True,
    },
    {
        "name": "run_sql",
        "description": "Run one read-only SQLite SELECT query on the job-search database. Returns JSON with columns and up to 50 rows.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "A single SQLite SELECT statement"}},
            "required": ["query"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]
SYSTEM = "You answer questions about the user's job search by querying their SQLite database. Look at the schema before writing SQL. Answer concisely and mention the numbers you found."


def run_tool(name: str, args: dict) -> str:
    if name == "get_schema":
        return get_schema()
    if name == "run_sql":
        return run_sql(args["query"])
    raise ValueError(f"Unknown tool {name}")


def ask(question: str, max_steps: int = 10) -> str:
    messages = [{"role": "user", "content": question}]
    for _ in range(max_steps):
        response = client.messages.create(
            model="claude-opus-5-5", max_tokens=16000, system=SYSTEM, tools=TOOLS, messages=messages,
        )
        if response.stop_reason != "tool_use":
            return next((b.text for b in response.content if b.type == "text"), "")

        messages.append({"role": "assistant", "content": response.content})
        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            print(f"  -> {block.name}({json.dumps(block.input)})")
            try:
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": run_tool(block.name, block.input)})
            except Exception as err:  # report the error so the model can fix its query
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": f"Error: {err}", "is_error": True})
        messages.append({"role": "user", "content": results})  # all results in one message
    return f"Stopped after {max_steps} steps."


if __name__ == "__main__":
    questions = sys.argv[1:] or [
        "How many applications do I have in each status?",
        "Which tier 2 companies have a referral but no interviews yet?",
        "What share of my interviews so far have I passed, by tier?",
    ]
    for q in questions:
        print(f"\nQ: {q}")
        print(f"A: {ask(q)}")` },
    ],
    leetcode: [
      { name: "347. Top K Frequent Elements", url: "https://leetcode.com/problems/top-k-frequent-elements/", level: "Medium", hint: "Count with a dict, then bucket sort by frequency (index = count) for O(n), or use a heap of size k for O(n log k)." },
      { name: "238. Product of Array Except Self", url: "https://leetcode.com/problems/product-of-array-except-self/", level: "Medium", hint: "No division: one left-to-right pass for prefix products, one right-to-left pass multiplying in suffix products." },
    ],
    resources: [
      { t: "Tool use overview", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview" },
      { t: "Messages API reference (content blocks, stop reasons)", url: "https://platform.claude.com/docs/en/api/messages/create" },
    ],
    done: "sql_agent.py answers the 3 questions correctly; a destructive request is refused by the tool; a sample transcript is in notes.md.",
    interview: "\"An LLM agent can run SQL on a customer's warehouse. What could go wrong, and how do you contain it?\" (Read-only roles, allow-listed tables, row limits, timeouts, PII masking, audit logs.)",
  },

  // ---------------------------------------------------------------- Thu
  "w1-thu": {
    goal: "Understand embeddings and vector similarity, and store and search vectors in Chroma.",
    objectives: [
      { t: "Read the Learn section: embeddings, cosine similarity, and where embeddings come from.", tip: "Anthropic doesn't make an embedding model. Today uses a small free local model, so no extra API key is needed." },
      { t: "Install chromadb and numpy; run section 1 of embeddings.py and read the similarity matrix.", tip: "Paraphrases should score highest. Find one pair where the scores surprise you and write down why." },
      { t: "Store ~20 short notes in a persistent Chroma collection with topic metadata.", tip: "Section 2. Persistent means the vectors survive restarts in chroma_db/." },
      { t: "Run the 3 sample queries, inspect the distances, and try a metadata filter.", tip: "Filters (where={...}) are how you'll later enforce permissions in enterprise RAG (Week 9)." },
      { t: "In notes.md, write 5 lines: when would keyword search beat embeddings?", tip: "Think IDs, error codes, rare names and exact phrases. This sets up hybrid search in Week 2." },
      { t: "LeetCode: Valid Sudoku and Longest Consecutive Sequence." },
    ],
    learn: [
      { h: "What an embedding is", html: `<p>An embedding model turns text into a fixed-length vector of numbers (384 dimensions for the model below; 1,024+ for larger ones). Texts with similar meaning land close together, so "how do I reset my password?" ends up near "I forgot my login", even with no words in common.</p><p><b>Cosine similarity</b> measures the angle between two vectors: 1 means the same direction, near 0 means unrelated. If you normalise vectors to length 1, cosine similarity is just a dot product, which is why vector databases normalise.</p>` },
      { h: "Where embeddings come from", html: `<p>Anthropic doesn't offer an embedding model; its docs point to <b>Voyage AI</b>. Other common choices are OpenAI's <code>text-embedding-3</code> models and open-source <code>sentence-transformers</code> models. Chroma's default embedding function runs <code>all-MiniLM-L6-v2</code> locally (it downloads ~80 MB the first time), which is perfect for learning. Whichever you choose, <b>embed documents and queries with the same model</b>.</p>` },
      { h: "Vector databases", html: `<p>A vector database stores vectors plus the original text and metadata, and answers "nearest neighbours to this query vector" quickly with an approximate index (usually HNSW, covered in Week 9). Chroma is the quickest to start with; <b>pgvector</b> adds the same thing to Postgres, which you'll use for Project 1. Most also support metadata filters, so you can search only one customer's or one topic's documents.</p>` },
    ],
    code: [
      { title: "Install", lang: "bash", src: String.raw`pip install chromadb numpy` },
      { title: "embeddings.py", lang: "python", src: String.raw`"""Day 5: embeddings, cosine similarity, and a persistent Chroma collection."""
import chromadb
import numpy as np
from chromadb.utils import embedding_functions

embed = embedding_functions.DefaultEmbeddingFunction()  # local all-MiniLM-L6-v2, 384 dimensions

# 1. Similarity matrix: paraphrases should score highest
sentences = [
    "How do I reset my password?",
    "I forgot my login credentials.",
    "What is the interest rate on this loan?",
    "How much APR will I pay on the mortgage?",
    "The model retrieves documents before answering.",
    "RAG looks up relevant text, then generates a response.",
]
vectors = np.array(embed(sentences))
vectors /= np.linalg.norm(vectors, axis=1, keepdims=True)  # unit length -> dot product = cosine
similarity = vectors @ vectors.T
print(f"dimensions: {vectors.shape[1]}")
for i, s in enumerate(sentences):
    best = max((j for j in range(len(sentences)) if j != i), key=lambda j: similarity[i, j])
    print(f"{s[:42]:<42} -> closest: {sentences[best][:42]:<42} ({similarity[i, best]:.2f})")

# 2. Store notes in a persistent collection
notes = {
    "rag": [
        "RAG retrieves relevant chunks and passes them to the model as context.",
        "Chunk size trades off precision against context: small chunks are precise but lose surrounding meaning.",
        "Hybrid search combines keyword (BM25) and vector scores.",
        "A reranker reorders retrieved chunks with a slower, more accurate model.",
        "Citations let users check every claim against its source.",
    ],
    "agents": [
        "An agent is a model using tools in a loop until the task is done.",
        "Tool descriptions are prompts: say what the tool does and when to use it.",
        "Guardrails belong in tools as well as prompts, e.g. read-only database users.",
        "Human approval is a good fit for irreversible actions like sending email.",
        "Workflows follow fixed code paths; agents decide their own next step.",
    ],
    "evals": [
        "Recall@k measures whether the right chunk appears in the top k results.",
        "LLM-as-judge grades answers against a rubric; check it against human labels.",
        "Execution accuracy compares query results, not SQL text.",
        "Keep a fixed eval set so you can compare runs before and after a change.",
        "Track cost and latency next to quality for every run.",
    ],
    "infra": [
        "Prompt caching reuses a stable prompt prefix to cut cost and latency.",
        "Streaming shows the first tokens quickly in user-facing apps.",
        "Batch APIs trade latency for a lower price on offline jobs.",
        "Log token usage per request to understand cost.",
        "Timeouts and retries with backoff handle transient API errors.",
    ],
}
client = chromadb.PersistentClient(path="chroma_db")
collection = client.get_or_create_collection(
    name="notes", embedding_function=embed, metadata={"hnsw:space": "cosine"},
)
collection.upsert(
    ids=[f"{topic}-{i}" for topic, items in notes.items() for i in range(len(items))],
    documents=[text for items in notes.values() for text in items],
    metadatas=[{"topic": topic} for topic, items in notes.items() for _ in items],
)
print(f"\ncollection has {collection.count()} notes")

# 3. Query, with and without a metadata filter
for query, where in [
    ("How do I know if my retrieval is any good?", None),
    ("How do I stop an agent from doing something dangerous?", None),
    ("How do I make answers cheaper?", {"topic": "infra"}),
]:
    result = collection.query(query_texts=[query], n_results=3, where=where)
    print(f"\nQ: {query}" + (f"  (filter {where})" if where else ""))
    for doc, dist in zip(result["documents"][0], result["distances"][0]):
        print(f"  {dist:.3f}  {doc}")` },
    ],
    leetcode: [
      { name: "36. Valid Sudoku", url: "https://leetcode.com/problems/valid-sudoku/", level: "Medium", hint: "One pass with sets for each row, column and 3×3 box; the box index is (r // 3, c // 3)." },
      { name: "128. Longest Consecutive Sequence", url: "https://leetcode.com/problems/longest-consecutive-sequence/", level: "Medium", hint: "Put numbers in a set; only start counting from n when n − 1 isn't in the set. Each number is visited at most twice: O(n)." },
    ],
    resources: [
      { t: "Embeddings (Anthropic docs, Voyage AI)", url: "https://platform.claude.com/docs/en/build-with-claude/embeddings" },
      { t: "OpenAI embeddings guide", url: "https://platform.openai.com/docs/guides/embeddings" },
      { t: "Chroma documentation", url: "https://docs.trychroma.com/" },
      { t: "pgvector (vector search in Postgres)", url: "https://github.com/pgvector/pgvector" },
      { t: "Sentence Transformers", url: "https://www.sbert.net/" },
    ],
    done: "embeddings.py runs and is committed; chroma_db/ holds 20 notes; your keyword-vs-vector note is in notes.md.",
    interview: "\"Your semantic search can't find a document when users search for its exact ticket ID. Why, and how do you fix it?\" (Embeddings blur exact tokens; add keyword/BM25 search, i.e. hybrid retrieval.)",
  },

  // ---------------------------------------------------------------- Fri
  "w1-fri": {
    goal: "Light day: learn the standard vocabulary for agent design from the two guides interviewers expect you to know.",
    objectives: [
      { t: "Read Anthropic's \"Building effective agents\".", tip: "~30 minutes. Pay attention to the five workflow patterns and when they recommend not building an agent." },
      { t: "Read OpenAI's \"A practical guide to building agents\" (PDF).", tip: "~30 minutes. Note how it splits agents into model, tools and instructions, and its layered guardrails." },
      { t: "Write a 1-page note using the template below and commit it as notes/agents.md.", tip: "Write it in your own words. You'll reuse it for system-design answers in Weeks 9–12." },
      { t: "LeetCode: Encode and Decode Strings.", tip: "It's premium on LeetCode but free on NeetCode (link below)." },
    ],
    learn: [
      { h: "The ideas to take away", html: `<ul><li><b>Workflows vs agents.</b> Workflows follow code paths you define; agents let the model decide its next step. Start with the simplest thing that works and add autonomy only when it pays for its cost and risk.</li><li><b>The augmented LLM</b>: one model plus retrieval, tools and memory is the building block of everything else.</li><li><b>Workflow patterns</b>: prompt chaining, routing, parallelization (sectioning and voting), orchestrator-workers, evaluator-optimizer.</li><li><b>Agents</b> run tools in a loop with feedback from the environment, and need stopping conditions and, for risky actions, human checkpoints.</li><li><b>Tool design</b> (the "agent-computer interface") deserves as much care as prompts.</li><li><b>Guardrails are layered</b>: input checks, tool-level permissions, output checks, and escalation to a human.</li></ul>` },
    ],
    code: [
      { title: "notes/agents.md template", lang: "markdown", src: String.raw`# Agents: 1-page notes (Week 1, Friday)

## Definitions in my own words
- Workflow:
- Agent:
- When NOT to build an agent:

## Patterns (one line + one example from banking/data work each)
- Prompt chaining:
- Routing:
- Parallelization:
- Orchestrator-workers:
- Evaluator-optimizer:

## Building blocks
- Model choice (when small vs large):
- Tools (what makes a good tool):
- Instructions:

## Guardrails and human-in-the-loop
- Layers:
- Which actions need approval:

## How this applies to my projects
- Project 1 (NL→SQL agent):
- Project 2 (health-info agent):` },
    ],
    leetcode: [
      { name: "Encode and Decode Strings", url: "https://neetcode.io/problems/string-encode-and-decode", level: "Medium", hint: "Length-prefix each string, e.g. '5#hello'. Decoding reads digits up to '#', then exactly that many characters, so any character can appear inside a string." },
    ],
    resources: [
      { t: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents" },
      { t: "OpenAI: A practical guide to building agents (PDF)", url: "https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf" },
    ],
    done: "notes/agents.md is committed and fits on one page; 1 LeetCode problem solved.",
    interview: "\"A customer asks for an autonomous agent to process their invoices. How do you decide between a workflow and an agent?\" (Predictability, cost of errors, variability of inputs, need for approval.)",
  },

  // ---------------------------------------------------------------- Sat
  "w1-sat": {
    goal: "Build a working mini-RAG end to end, ingest → chunk → embed → retrieve → answer with citations, and push it to GitHub.",
    objectives: [
      { t: "Ingest: download ~20 public Wikipedia articles on credit risk into data/ with ingest.py.", tip: "Public data only, and a domain where your Citi experience helps you judge answer quality. Swap the topic list if you prefer." },
      { t: "Chunk the articles (~800 characters with overlap) and index them in Chroma: python rag.py index.", tip: "Note the chunk count it prints. Week 2 compares chunking strategies against this baseline." },
      { t: "Check retrieval first: python rag.py search \"…\" for 3 questions, and judge the top-5 chunks.", tip: "Always debug retrieval before generation. If the right chunk isn't retrieved, no prompt can save the answer. Try \"difference between value at risk and expected shortfall\": all 5 chunks come from one article and none from Value at risk. That's the kind of gap Week 2's hybrid search and reranking fix." },
      { t: "Generate answers with citations: python rag.py ask \"…\".", tip: "Every claim should carry a [n] that points to a listed source." },
      { t: "Test 5 questions, including 1 the sources can't answer, and write down each failure.", tip: "The unanswerable one should get \"I don't know based on these sources.\" These questions seed Monday's eval set." },
      { t: "Write a README (what it does, how to run it, example output, known limits) and push.", tip: "Known limits are a strength in interviews: they show you measure and iterate." },
    ],
    learn: [
      { h: "The RAG pipeline", html: `<ol><li><b>Ingest</b>: get documents and keep their source.</li><li><b>Chunk</b>: split into pieces small enough to be specific but big enough to make sense alone; overlap so ideas aren't cut in half.</li><li><b>Embed and index</b>: vectors plus text and metadata (source, chunk number).</li><li><b>Retrieve</b>: the top-k chunks nearest to the question.</li><li><b>Generate</b>: the model answers <em>only</em> from those chunks and cites them.</li></ol>` },
      { h: "Why answers go wrong", html: `<p>Separate the two failure types: <b>retrieval failures</b> (the right chunk wasn't in the top k: fix chunking, embeddings, hybrid search, reranking) and <b>generation failures</b> (the chunk was there but the answer ignored or distorted it: fix the prompt, citations, or model). Week 2 measures both separately with recall@k and an LLM judge.</p>` },
      { h: "Grounding and citations", html: `<p>Number each source in XML tags, tell the model to cite <code>[n]</code> for every claim and to say "I don't know" when the sources don't cover the question. Then print the sources under the answer so a reader can check them. That's the minimum trust layer for any enterprise RAG demo.</p>` },
    ],
    code: [
      { title: "Install", lang: "bash", src: String.raw`pip install requests chromadb` },
      { title: "ingest.py", lang: "python", src: String.raw`"""Downloads public Wikipedia articles (plain text) into data/ for the mini-RAG."""
import pathlib
import re
import time

import requests

TOPICS = [
    "Credit risk", "Probability of default", "Loss given default", "Exposure at default",
    "Credit score", "Basel III", "Credit default swap", "Risk-weighted asset",
    "Credit rating agency", "Altman Z-score", "Stress test (financial)", "Value at risk",
    "Collateral (finance)", "Securitization", "Credit valuation adjustment",
    "Logistic regression", "Gradient boosting", "Model risk", "Know your customer", "Expected shortfall",
]
API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "ai-portfolio-mini-rag/0.1 (learning project)"}



def fetch(title: str, attempts: int = 4) -> dict:
    """One article as {title, extract}; waits and retries if Wikipedia throttles us."""
    params = {"action": "query", "prop": "extracts", "explaintext": 1, "redirects": 1, "format": "json", "titles": title}
    for attempt in range(attempts):
        try:
            response = requests.get(API, params=params, headers=HEADERS, timeout=30)
            response.raise_for_status()
            return next(iter(response.json()["query"]["pages"].values()))
        except (requests.RequestException, ValueError, KeyError):
            if attempt == attempts - 1:
                raise
            time.sleep(2 ** attempt * 5)  # 5s, 10s, 20s


out = pathlib.Path("data")
out.mkdir(exist_ok=True)
for title in TOPICS:
    page = fetch(title)
    time.sleep(1)  # be polite: one request per second
    if "missing" in page or not page.get("extract"):
        print(f"skip: {title} (not found)")
        continue
    name = re.sub(r"[^a-z0-9]+", "-", page["title"].lower()).strip("-")
    (out / f"{name}.txt").write_text(f"{page['title']}\n\n{page['extract']}", encoding="utf-8")
    print(f"saved {name}.txt ({len(page['extract']):,} chars)")` },
      { title: "rag.py", lang: "python", src: String.raw`"""Mini-RAG: index data/*.txt in Chroma, retrieve top-k chunks, answer with citations.

Usage:
  python rag.py index
  python rag.py search "What is loss given default?"
  python rag.py ask "How does Basel III treat credit risk?"
"""
import pathlib
import sys

import anthropic
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

load_dotenv()
DATA = pathlib.Path("data")
collection = chromadb.PersistentClient(path="chroma_db").get_or_create_collection(
    name="wiki",
    embedding_function=embedding_functions.DefaultEmbeddingFunction(),
    metadata={"hnsw:space": "cosine"},
)


def chunk(text: str, size: int = 800, overlap: int = 150) -> list[str]:
    """Pack paragraphs into ~size-character chunks, carrying overlap between chunks."""
    chunks, current = [], ""
    for paragraph in (p.strip() for p in text.split("\n")):
        if not paragraph:
            continue
        if current and len(current) + len(paragraph) + 1 > size:
            chunks.append(current)
            current = current[-overlap:]  # carry the end of the previous chunk forward
        current = f"{current}\n{paragraph}" if current else paragraph
    if current:
        chunks.append(current)
    return chunks


def index() -> None:
    ids, docs, metas = [], [], []
    for path in sorted(DATA.glob("*.txt")):
        for i, piece in enumerate(chunk(path.read_text(encoding="utf-8"))):
            ids.append(f"{path.stem}-{i}")
            docs.append(piece)
            metas.append({"source": path.stem, "chunk": i})
    collection.upsert(ids=ids, documents=docs, metadatas=metas)
    print(f"indexed {len(ids)} chunks from {len(list(DATA.glob('*.txt')))} documents")


def retrieve(question: str, k: int = 5) -> list[tuple[str, dict, float]]:
    result = collection.query(query_texts=[question], n_results=k)
    return list(zip(result["documents"][0], result["metadatas"][0], result["distances"][0]))


SYSTEM = """You answer questions using only the numbered sources provided.
Cite every claim with its source number in square brackets, like [2].
If the sources don't contain the answer, reply exactly: "I don't know based on these sources."
Do not use outside knowledge."""


def ask(question: str) -> str:
    hits = retrieve(question)
    sources = "\n\n".join(
        f'<source id="{n}" title="{meta["source"]}">\n{doc}\n</source>' for n, (doc, meta, _) in enumerate(hits, 1)
    )
    response = anthropic.Anthropic().messages.create(
        model="claude-opus-5-5",
        max_tokens=16000,
        system=SYSTEM,
        messages=[{"role": "user", "content": f"<sources>\n{sources}\n</sources>\n\nQuestion: {question}"}],
    )
    answer = next((b.text for b in response.content if b.type == "text"), "")
    refs = "\n".join(
        f"[{n}] {meta['source']} (chunk {meta['chunk']}, distance {dist:.2f})" for n, (_, meta, dist) in enumerate(hits, 1)
    )
    return f"{answer}\n\nSources:\n{refs}"


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Wikipedia text has Greek letters etc.; Windows consoles default to cp1252
    command, *rest = sys.argv[1:] or ["help"]
    if command == "index":
        index()
    elif command == "search" and rest:
        for doc, meta, dist in retrieve(" ".join(rest)):
            print(f"\n[{meta['source']} #{meta['chunk']}, distance {dist:.3f}]\n{doc[:300]}…")
    elif command == "ask" and rest:
        print(ask(" ".join(rest)))
    else:
        print(__doc__)` },
      { title: "Questions to test (add your own)", lang: "text", src: String.raw`What are the three components of expected credit loss?
How does Basel III define the capital conservation buffer?
What is the difference between value at risk and expected shortfall?
What inputs does the Altman Z-score use?
What was Citi's net income last quarter?          <- should be "I don't know"` },
    ],
    resources: [
      { t: "Anthropic: contextual retrieval and RAG basics", url: "https://www.anthropic.com/news/contextual-retrieval" },
      { t: "Chroma: query and filter", url: "https://docs.trychroma.com/" },
      { t: "Wikipedia API: TextExtracts", url: "https://www.mediawiki.org/wiki/Extension:TextExtracts" },
    ],
    done: "rag.py and ingest.py are on GitHub with a README showing an example answer with citations, plus 5 tested questions and their known failures.",
    interview: "\"Your RAG system gives a wrong answer. Walk me through how you debug it.\" (Check retrieval first (was the right chunk retrieved?), then grounding, then the prompt; build an eval set so the fix is measurable.)",
  },
});
