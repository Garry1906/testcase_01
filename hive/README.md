# The Hive

A meeting place on your phone where **Claude**, **Perplexity** and **Copilot** work together
on your tasks, reach a consensus, and build the result together.

## How a meeting works

1. **Proposals.** Each AI answers your task on its own, at the same time.
2. **Discussion.** Each one reads the others' ideas and revises its position.
3. **Consensus plan.** The chair (Claude by default) drafts one plan, and every step is tagged with the AI that owns it.
4. **Vote.** Each AI agrees or objects. An objection sends the plan back for revision, up to twice. After that, the majority decides.
5. **Your call.** You approve the plan, or type changes and the Hive revises it and votes again.
6. **Build.** Perplexity researches, Copilot drafts using that research, and the chair checks the work and assembles one final result with sources.
7. **Feedback.** Anything you tell it after a meeting is saved under **Memory**. Every AI reads that list before each future meeting.

If an AI fails (bad key, outage), the meeting goes on with the others. If no accounts are connected, the Hive runs in **demo mode** with sample replies, so you can try it first.

## The members and their avatars

The avatars are original art based on each company's stated mission. They are not the companies' logos.

| Member | Company | Role in the Hive | Avatar idea |
|---|---|---|---|
| Claude | Anthropic | Steward and integrator | Safety and honesty: a steady flame inside a protective ring |
| Perplexity | Perplexity | Researcher | Curiosity and accuracy: a lens whose light branches into linked sources |
| Copilot | Microsoft | Builder | Empowering people: two wings side by side, flying one course |

## Connecting your accounts

These services don't let outside apps sign in with your normal chat password. So in the
**Connect** tab you sign in to each account's developer page, copy a key, and paste it in
once. The key is stored only on that phone and is sent only to that AI's own service.

| Member | Where to get the key | Notes |
|---|---|---|
| Claude | console.anthropic.com → API keys | Uses Anthropic API credit, which is separate from a Claude.ai subscription |
| Perplexity | perplexity.ai → Settings → API | Pro subscribers get monthly API credit |
| Copilot | github.com → Settings → Fine-grained tokens, with **Models: Read** permission | Microsoft Copilot has no public API, so this member runs on **GitHub Models**, the OpenAI models behind Copilot, using your GitHub login. There is a free tier. |

**Second phone:** on the first phone, open **Connect → Copy setup code**. On the second phone,
open **Connect → Paste setup code**. The code contains your keys, so send it only to yourself.

## Installing on your phones

### Option A: home-screen app (quickest, works on iPhone and Android)

Host the `www/` folder anywhere that serves HTTPS, for example GitHub Pages pointed at
`hive/www`. Then:
- **iPhone:** open it in Safari → Share → **Add to Home Screen**
- **Android:** open it in Chrome → ⋮ → **Install app**

After the first load it opens offline like a normal app. **Limitation:** inside a browser,
some providers may block direct calls from a web page. Claude's API allows them; Perplexity's
and GitHub's may not. If one shows "Couldn't reach the service", use Option B.

### Option B: a real installed app (recommended; no such limits)

The project is set up for [Capacitor](https://capacitorjs.com). Its native networking avoids
the browser restriction above.

```bash
cd hive
npm install
npm run android   # opens Android Studio → Run on your phone, or Build → APK
npm run ios       # needs a Mac with Xcode → Run on your iPhone
```

## Files

```
hive/
  www/index.html          screens: Hive, Connect, Memory
  www/js/app.js           interface, storage, meeting flow
  www/js/council.js       consensus protocol (propose → discuss → plan → vote → build)
  www/js/agents.js        member personas and the three provider connections
  www/js/avatars.js       original avatar art
  www/sw.js               offline support
  capacitor.config.json   native app packaging
```
