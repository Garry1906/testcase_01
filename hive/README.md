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

### Samsung Galaxy S25 Ultra: real Android app

GitHub builds the app file for you automatically (`.github/workflows/hive-android.yml`).
You don't need Android Studio.

1. On GitHub, open the repo → **Actions** → **Hive — Android app** → the latest green run.
2. Under **Artifacts**, download **TheHive-android** on your S25. It's a zip; open it to get `TheHive.apk`.
3. Tap `TheHive.apk`. If asked, allow **My Files** (or Chrome) to **Install unknown apps**.
   If Samsung's **Auto Blocker** is on, turn it off for the install (Settings → Security and privacy → Auto Blocker), then turn it back on.
4. Open **The Hive** from your apps.

The installed app uses native networking, so all three members can connect.

### iPhone: home-screen app

Apple only installs real apps that are built on a Mac or come from the App Store. On an
iPhone, the Hive runs as a home-screen web app instead.

1. One-time setup: on GitHub, open the repo → **Settings → Pages** → under **Source**, choose
   **GitHub Actions**. After the Hive is merged into `master`, it publishes to
   `https://garry1906.github.io/testcase_01/`. The page contains no keys.
2. On your iPhone, open that address in **Safari** → **Share** → **Add to Home Screen**.
3. Open **The Hive** from your home screen. After the first load it works offline.

**Limitation on iPhone:** web apps can only reach services that accept calls from a web
page. Claude does. Perplexity and GitHub Models may not. If a member shows "Couldn't reach
the service", connect it on the Samsung instead, and use the iPhone for the members that work.

To get a real iPhone app later, borrow a Mac and run `cd hive && npm install && npm run ios`.
That opens Xcode; plug in the iPhone and press Run. With a free Apple ID the app expires after
7 days; a $99/year Apple Developer account removes that limit.

### Building the Android app yourself

```bash
cd hive
npm install
npm run android   # opens Android Studio → Run, or Build → APK
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
