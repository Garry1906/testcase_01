// The three Hive members and the code that talks to each provider.
// Keys never leave the phone except to go to that member's own provider.

export const MEMBERS = {
  claude: {
    id: "claude",
    name: "Claude",
    company: "Anthropic",
    role: "Steward & integrator",
    creed: "Honest, careful, genuinely helpful. Flags risks and pulls the team's work together.",
    color: "#C2643C",
    persona:
      "You are Claude, made by Anthropic. In the Hive you are the steward and integrator: " +
      "you value honesty, care for the user, safety and clear reasoning. You point out risks " +
      "and trade-offs plainly, give credit to good ideas from others, and you are the one who " +
      "weaves everyone's work into a finished result.",
    defaultModel: "claude-opus-5-5",
    keyLabel: "Anthropic API key",
    keyHint: "sk-ant-…",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keySteps: "Sign in to the Anthropic Console → API keys → Create key → copy it.",
  },
  perplexity: {
    id: "perplexity",
    name: "Perplexity",
    company: "Perplexity",
    role: "Researcher",
    creed: "Curious and accurate. Checks today's facts and shows its sources.",
    color: "#127C7A",
    persona:
      "You are Perplexity, the Hive's researcher. You value curiosity and accuracy above all: " +
      "you ground claims in current, real sources, you say when something is uncertain, and you " +
      "cite where facts come from. You bring the facts the team needs to decide well.",
    defaultModel: "sonar-pro",
    keyLabel: "Perplexity API key",
    keyHint: "pplx-…",
    keyUrl: "https://www.perplexity.ai/account/api/keys",
    keySteps: "Sign in to Perplexity → Settings → API → Generate key → copy it.",
  },
  copilot: {
    id: "copilot",
    name: "Copilot",
    company: "Microsoft · via GitHub Models",
    role: "Builder",
    creed: "Empowers you to get more done. Turns plans into concrete steps, drafts and code.",
    color: "#5B3FC4",
    persona:
      "You are Copilot, the Hive's builder. Your belief is empowering the user to achieve more: " +
      "you are practical and productive, you turn ideas into concrete steps, drafts, checklists " +
      "and working code, and you keep things moving toward something the user can actually use.",
    defaultModel: "openai/gpt-4.1",
    keyLabel: "GitHub token (models access)",
    keyHint: "github_pat_…",
    keyUrl: "https://github.com/settings/personal-access-tokens/new",
    keySteps:
      "Sign in to GitHub → Fine-grained token → under Account permissions set Models to Read → Generate → copy it.",
  },
};

export const ORDER = ["perplexity", "copilot", "claude"]; // research → build → integrate

const HIVE_RULES =
  "You are one of up to three AI assistants (Claude, Perplexity, Copilot) meeting in 'the Hive' " +
  "to work for one person. Collaborate: build on each other's ideas, disagree honestly when it " +
  "matters, and aim for the plan that best serves the user. Be concise and concrete; no filler.";

export function systemPrompt(member, prefs) {
  const p = prefs.length
    ? "\n\nWhat the user has told the Hive they like (follow these):\n- " + prefs.join("\n- ")
    : "";
  return `${HIVE_RULES}\n\n${member.persona}${p}`;
}

class ProviderError extends Error {}

async function postJSON(url, headers, body, signal) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ProviderError(
      "Couldn't reach the service. If you're using the web version, this provider may block " +
        "browser calls — the installed phone app (see README) avoids that.",
    );
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || text.slice(0, 200) || res.statusText;
    if (res.status === 401 || res.status === 403) throw new ProviderError(`Key rejected (${res.status}): ${msg}`);
    throw new ProviderError(`Error ${res.status}: ${msg}`);
  }
  return data;
}

const CALLERS = {
  async claude({ key, model, system, prompt, signal }) {
    const data = await postJSON(
      "https://api.anthropic.com/v1/messages",
      {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      { model, max_tokens: 2500, system, messages: [{ role: "user", content: prompt }] },
      signal,
    );
    return {
      text: (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n"),
      sources: [],
    };
  },

  async perplexity({ key, model, system, prompt, signal }) {
    const data = await postJSON(
      "https://api.perplexity.ai/chat/completions",
      { authorization: `Bearer ${key}` },
      {
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      },
      signal,
    );
    const sources = data.citations || (data.search_results || []).map((r) => r.url);
    return { text: data.choices?.[0]?.message?.content || "", sources: sources.filter(Boolean) };
  },

  async copilot({ key, model, system, prompt, signal }) {
    const data = await postJSON(
      "https://models.github.ai/inference/chat/completions",
      {
        authorization: `Bearer ${key}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
      {
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      },
      signal,
    );
    return { text: data.choices?.[0]?.message?.content || "", sources: [] };
  },
};

// ---- Demo mode: lets you try the Hive before connecting any account. ----
const DEMO_LINES = {
  claude: {
    propose:
      "I'd start by pinning down what 'done' looks like for you, then split the work: Perplexity checks current facts, Copilot drafts, and I review and assemble. Biggest risk: building the wrong thing fast — so we confirm the plan with you first.",
    deliberate:
      "Copilot's step-by-step breakdown is the strongest base. I'd fold in Perplexity's point about checking current options first. Revised position: research → draft → review, with one check-in with you.",
    build:
      "**Final result (demo)**\n\n1. Research summary from Perplexity\n2. Draft from Copilot\n3. Reviewed and tightened\n\nConnect your accounts in **Connect** to get real answers.",
  },
  perplexity: {
    propose:
      "Before we build, I'll look up what's current — prices, options, recent changes — so the plan rests on real facts. I'll bring 3–5 sources.",
    deliberate:
      "Agree with Claude on confirming 'done' first. Copilot's plan works; my addition is a quick fact check before the draft.",
    build: "Research notes (demo): three up-to-date options compared, with sources.",
  },
  copilot: {
    propose:
      "Let's make it concrete: 1) list requirements, 2) draft a first version today, 3) iterate once on your feedback. I'll own the draft.",
    deliberate:
      "Good catch from Perplexity — I'll draft from their research instead of assumptions. Plan holds: research, draft, review.",
    build: "Draft (demo): a first working version built from Perplexity's notes.",
  },
};

function demoReply(id, phase, prompt) {
  if (phase === "vote") return { text: '{"vote":"agree","reason":"Plan is clear and uses everyone well."}', sources: [] };
  if (phase === "synthesize") {
    return {
      text:
        "## Plan\n1. [Perplexity] Research current facts and options\n2. [Copilot] Draft a first version from that research\n3. [Claude] Review, fix gaps, and assemble the final result\n\n## Why this approach\nFacts first, then a fast draft, then a careful finish.\n\n## Questions for you\n- Anything you definitely want or want to avoid?",
      sources: [],
    };
  }
  const line = DEMO_LINES[id][phase] || DEMO_LINES[id].propose;
  return {
    text: line,
    sources: id === "perplexity" && phase !== "vote" ? ["https://example.com/demo-source"] : [],
  };
}

export function makeAgent(id, conn, prefs, demo) {
  const member = MEMBERS[id];
  return {
    ...member,
    demo,
    async ask(prompt, phase, signal) {
      if (demo) {
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 900));
        return demoReply(id, phase, prompt);
      }
      return CALLERS[id]({
        key: conn.key,
        model: conn.model || member.defaultModel,
        system: systemPrompt(member, prefs),
        prompt,
        signal,
      });
    },
  };
}

export async function testConnection(id, conn) {
  const r = await CALLERS[id]({
    key: conn.key,
    model: conn.model || MEMBERS[id].defaultModel,
    system: "Reply with exactly: ready",
    prompt: "Say ready.",
  });
  return r.text.trim();
}
