# Orchestrator Quickstart

See Mault docs for setup.

## Forensics — Diagnostic Files

| File | What It Reveals |
|------|----------------|
| `.claude/hooks-paused.json` | Hooks are parked — user ran Pause command |
| `.claude/settings.paused.json` | Manual escape — user renamed settings.json |
| `.mault/sessions/{id}.json` | Session identity — role, pid, started time |
| `.mault/sessions/{id}/occupancy-checked` | Bootstrap ran but session file may be missing |
| `.mault/sessions/{id}/bootstrap-failure.json` | Bootstrap Phase 5 write failed — error details |
| `.claude/settings.local.json` | Role-specific deny overrides (gitignored) |
| `.claude/hooks/*.js` | Hook source files (untouched by pause/resume) |
