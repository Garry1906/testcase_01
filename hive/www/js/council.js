// How the Hive reaches consensus and then builds.
//
//   1. Propose     — every member answers the task independently (in parallel)
//   2. Deliberate  — each reads the others' proposals and revises its position
//   3. Synthesize  — the chair drafts one plan, each step owned by a member
//   4. Vote        — everyone agrees or objects; objections trigger a revision
//                    (up to MAX_REVISIONS), then majority rules
//   5. You approve — or send changes, which go back through steps 3–4
//   6. Build       — research → build → integrate, each seeing prior work

const MAX_REVISIONS = 2;

const fmt = (agents, items) =>
  items.map((m) => `### ${agents.find((a) => a.id === m.agentId).name}\n${m.text}`).join("\n\n");

function parseVote(text) {
  const m = text.match(/\{[\s\S]*\}/);
  try {
    const v = JSON.parse(m ? m[0] : text);
    return { agree: String(v.vote).toLowerCase() !== "object", reason: String(v.reason || "") };
  } catch {
    return { agree: !/\bobject\b/i.test(text), reason: text.slice(0, 240) };
  }
}

export class Council {
  constructor({ agents, chairId, ui }) {
    this.ui = ui;
    this.agents = agents;
    this.chair = agents.find((a) => a.id === chairId) || agents[0];
    this.controller = new AbortController();
  }

  stop() {
    this.controller.abort();
  }

  // Ask several members at once; drop any that fail, but keep going.
  async round(phase, members, promptFor) {
    const out = await Promise.all(
      members.map(async (a) => {
        this.ui.thinking(a.id, true);
        try {
          const r = await a.ask(promptFor(a), phase, this.controller.signal);
          return { agentId: a.id, phase, text: r.text, sources: r.sources };
        } catch (e) {
          if (e.name === "AbortError") throw e;
          this.ui.error(a.id, e.message);
          return null;
        } finally {
          this.ui.thinking(a.id, false);
        }
      }),
    );
    return out.filter(Boolean);
  }

  async deliberate(task) {
    const names = this.agents.map((a) => a.name).join(", ");
    this.task = task;

    this.ui.phase("Proposals", "Each member answers on its own first.");
    const proposals = await this.round("propose", this.agents, () =>
      `The user's task:\n"""${task}"""\n\nMembers present: ${names}.\n` +
        "Propose how the Hive should handle this in under 150 words: the key steps, what you " +
        "personally would contribute given your strengths, and the biggest risk.",
    );
    proposals.forEach((m) => this.ui.message(m));
    if (!proposals.length) throw new Error("No member could answer. Check your connections.");
    this.proposals = proposals;

    if (this.agents.length > 1) {
      this.ui.phase("Discussion", "Members read each other's ideas and refine.");
      const views = await this.round("deliberate", this.agents, (a) =>
        `Task:\n"""${task}"""\n\nProposals so far:\n\n${fmt(this.agents, proposals)}\n\n` +
          `You are ${a.name}. In under 120 words: what is strongest in the others' ideas, ` +
          "what you would change, and your revised position.",
      );
      views.forEach((m) => this.ui.message(m));
      this.views = views;
    } else {
      this.views = [];
    }

    return this.reachConsensus();
  }

  async reachConsensus(userChanges) {
    const owners = this.agents.map((a) => `[${a.name}]`).join(", ");
    let objections = "";
    let plan;

    for (let attempt = 0; attempt <= MAX_REVISIONS; attempt++) {
      this.ui.phase(
        attempt === 0 ? "Consensus plan" : `Revised plan (${attempt})`,
        `${this.chair.name} is chairing and drafting the plan.`,
      );
      const [draft] = await this.round("synthesize", [this.chair], () =>
        `Task:\n"""${this.task}"""\n\nProposals:\n\n${fmt(this.agents, this.proposals)}\n\n` +
          (this.views.length ? `Discussion:\n\n${fmt(this.agents, this.views)}\n\n` : "") +
          (plan ? `Previous plan:\n${plan}\n\n` : "") +
          (objections ? `Objections to address:\n${objections}\n\n` : "") +
          (userChanges ? `The user asked for these changes (top priority):\n${userChanges}\n\n` : "") +
          "Write the Hive's single consensus plan. Use exactly this format:\n" +
          "## Plan\nNumbered steps; start each with its owner tag, one of " +
          `${owners}.\n## Why this approach\n2–3 sentences.\n## Questions for you\n` +
          "Only questions that truly matter (or 'None').",
      );
      if (!draft) throw new Error(`${this.chair.name} couldn't draft the plan.`);
      plan = draft.text;
      this.ui.message({ ...draft, kind: "plan" });

      if (this.agents.length === 1) break;

      this.ui.phase("Vote", "Does everyone agree?");
      const votes = await this.round("vote", this.agents, (a) =>
        `Task:\n"""${this.task}"""\n\nProposed plan:\n${plan}\n\n` +
          `You are ${a.name}. Do you agree this is the best way forward? Object only for a ` +
          'real problem. Reply ONLY with JSON: {"vote":"agree" or "object","reason":"one sentence"}',
      );
      const tally = votes.map((v) => ({ agentId: v.agentId, ...parseVote(v.text) }));
      this.ui.votes(tally);
      const against = tally.filter((v) => !v.agree);
      if (!against.length) break;
      if (attempt === MAX_REVISIONS) {
        const passed = against.length < tally.length / 2;
        this.ui.note(passed ? "Majority agrees — moving forward." : "No consensus yet — your call.");
        break;
      }
      objections = against
        .map((v) => `- ${this.agents.find((a) => a.id === v.agentId).name}: ${v.reason}`)
        .join("\n");
    }
    this.plan = plan;
    return plan;
  }

  async build(order) {
    this.ui.phase("Building", "Research first, then the build, then the final assembly.");
    const sequence = order
      .map((id) => this.agents.find((a) => a.id === id))
      .filter(Boolean)
      .filter((a) => a !== this.chair);
    const work = [];
    for (const a of sequence) {
      const [m] = await this.round("build", [a], () =>
        `Task:\n"""${this.task}"""\n\nAgreed plan:\n${this.plan}\n\n` +
          (work.length ? `Work done so far by teammates:\n\n${fmt(this.agents, work)}\n\n` : "") +
          `You are ${a.name}. Do the plan steps tagged [${a.name}] now, fully. Output the actual ` +
          "work (research, draft, code, etc.), not a description of it.",
      );
      if (m) {
        work.push(m);
        this.ui.message(m);
      }
    }
    const [final] = await this.round("build", [this.chair], () =>
      `Task:\n"""${this.task}"""\n\nAgreed plan:\n${this.plan}\n\n` +
        (work.length ? `Teammates' work:\n\n${fmt(this.agents, work)}\n\n` : "") +
        `You are ${this.chair.name}, the chair. Do your own tagged steps, then assemble ` +
        "everything into ONE finished deliverable for the user. Fix mistakes, fill gaps, credit " +
        "sources. Start with a one-line summary.",
    );
    if (!final) throw new Error("The final assembly failed.");
    const sources = [...new Set(work.flatMap((w) => w.sources || []))];
    const result = { ...final, sources, kind: "final" };
    this.ui.message(result);
    return result;
  }
}
