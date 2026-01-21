MAKEFILE_ABS_DIR := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))

# Store pycache in tmp directory
export PYTHONPYCACHEPREFIX := $(MAKEFILE_ABS_DIR)tmp/pycache

# Use copy mode for uv (avoids reflink warnings on some filesystems)
export UV_LINK_MODE := copy

# Store venv in tmp directory
export VIRTUAL_ENV := $(MAKEFILE_ABS_DIR)tmp/venv
VENV_BIN := tmp/venv/bin
PYTEST := $(VENV_BIN)/pytest
RUFF := $(VENV_BIN)/ruff

.DEFAULT_GOAL := help

##@ Help
.PHONY: help
help: ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)


##@ Development
.PHONY: dev
dev: env ## Run dev server (backend + frontend watch)
	@npm run dev

.PHONY: components
components: ## Serve component demos
	@npx vite --clearScreen false /lence/frontend/components/__tests__/

##@ Environment
.PHONY: env
env: ## Set up development environment
	@echo "Setting up development environment..."
	@command -v jq >/dev/null 2>&1 || { echo "Error: jq is required but not installed"; exit 1; }
	@test -d tmp/venv || uv venv tmp/venv
	@uv pip install -e '.[dev]'
	@npm install
	@echo "✓ Development environment ready"

.PHONY: clean
clean: ## Clean up build artifacts
	@echo "Cleaning up..."
	@rm -rf dist
	@rm -rf lence.egg-info
	@rm -rf .ruff_cache/
	@rm -rf node_modules/*
	@rm -f lence/static/*.js lence/static/*.js.map
	@rm -rf tmp/*
	@find . -name "*~" -delete
	@echo "Cleaned up"


##@ Compiling
.PHONY: build-frontend
build-frontend: env ## Build frontend assets
	@echo "Building frontend..."
	@npm ci && npm run build
	@echo "✓ Frontend built"

.PHONY: build
build: env build-frontend licenses-collect ## Build Python package
	@echo "Building package..."
	@uv build
	@echo "✓ Package built"


##@ Linting / Formatting
.PHONY: format
format: env ## Format code with ruff
	@echo "Formatting code..."
	@$(RUFF) format lence/

.PHONY: lint
lint: env ## Check code style with ruff
	@echo "Checking code style..."
	@$(RUFF) check lence/

.PHONY: lint-fix
lint-fix: env ## Fix code style issues automatically
	@echo "Fixing code style..."
	@$(RUFF) check --fix lence/


##@ Testing
.PHONY: test
test: env ## Run all tests (backend + frontend)
	@$(PYTEST)
	@npm run test

.PHONY: test-watch
test-watch: env ## Run tests in watch mode
	@$(PYTEST) --watch


##@ Licenses
# Allowed licenses for bundled dependencies
ALLOWED_LICENSES := MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;0BSD

.PHONY: licenses-check
licenses-check: env ## Verify all bundled deps use allowed licenses
	@echo "Checking licenses against allowed list: $(ALLOWED_LICENSES)"
	@npx license-checker --production --onlyAllow "$(ALLOWED_LICENSES)" --excludePackages "$$(jq -r '"lence@" + .version' package.json)"
	@echo "✓ All licenses OK"

.PHONY: licenses-collect
licenses-collect: env licenses-check ## Generate THIRD-PARTY-LICENSES file for bundled npm deps
	@./scripts/collect-licenses.sh lence/THIRD-PARTY-LICENSES
