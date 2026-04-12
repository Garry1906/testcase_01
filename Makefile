.PHONY: test test-tia

test:
	pytest tests/ -v

test-tia:
	@if [ "$$CI" = "true" ]; then \
		echo "🔒 CI Safety Latch: running ALL tests"; \
		pytest tests/; \
	else \
		echo "🎯 TIA: running affected tests only"; \
		pytest --testmon; \
	fi
