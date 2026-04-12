#!/usr/bin/env bash
# Layer 3: Jest TIA — run tests related to staged files
export DATABASE_URL=postgresql://test:test@localhost:5432/testdb
export OPENAI_API_KEY=sk-test-key
npx jest --findRelatedTests --passWithNoTests --forceExit "$@"
