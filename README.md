# testcase-01

[![CI](https://github.com/Garry1906/testcase_01/actions/workflows/ci.yml/badge.svg)](https://github.com/Garry1906/testcase_01/actions/workflows/ci.yml)

Full-stack TypeScript + Python project with Mault governance.

## Stack

- **TypeScript** — Node.js with Zod env validation
- **Python** — Pydantic Settings config
- **Docker** — Multi-stage builds with docker-compose

## Development

```bash
cp .env.example .env
# Fill in required values: DATABASE_URL, OPENAI_API_KEY
npm install
npm run dev
```
