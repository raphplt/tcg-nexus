PYTHON = python3
VENV = .venv

.PHONY: venv install run import-tcgdex

venv:
	$(PYTHON) -m venv $(VENV)

install: venv
	@if [ -f "$(VENV)/Scripts/pip.exe" ]; then \
		$(VENV)/Scripts/pip.exe install -r requirements.in && $(VENV)/Scripts/pip.exe freeze > requirements.txt; \
	elif [ -f "$(VENV)/Scripts/pip" ]; then \
		$(VENV)/Scripts/pip install -r requirements.in && $(VENV)/Scripts/pip freeze > requirements.txt; \
	else \
		$(VENV)/bin/pip install -r requirements.in && $(VENV)/bin/pip freeze > requirements.txt; \
	fi

run: venv
	@if [ -f "$(VENV)/Scripts/python.exe" ]; then \
		$(VENV)/Scripts/pip.exe install -r requirements.txt >NUL 2>&1 && PYTHONPATH=. $(VENV)/Scripts/python.exe -m uvicorn app.main:app --reload; \
	elif [ -f "$(VENV)/Scripts/python" ]; then \
		$(VENV)/Scripts/pip install -r requirements.txt >/dev/null 2>&1 && PYTHONPATH=. $(VENV)/Scripts/python -m uvicorn app.main:app --reload; \
	else \
		$(VENV)/bin/pip install -r requirements.txt >/dev/null 2>&1 && PYTHONPATH=. $(VENV)/bin/python -m uvicorn app.main:app --reload; \
	fi

import-tcgdex: install
	@if [ -f "$(VENV)/Scripts/python.exe" ]; then \
		PYTHONPATH=. $(VENV)/Scripts/python.exe scripts/import_tcgdex.py; \
	elif [ -f "$(VENV)/Scripts/python" ]; then \
		PYTHONPATH=. $(VENV)/Scripts/python scripts/import_tcgdex.py; \
	else \
		PYTHONPATH=. $(VENV)/bin/python scripts/import_tcgdex.py; \
	fi
