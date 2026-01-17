MAKEFILE_ABS_DIR := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))

# Store pycache in tmp directory
export PYTHONPYCACHEPREFIX := $(MAKEFILE_ABS_DIR)tmp/pycache

# Use copy mode for uv (avoids reflink warnings on some filesystems)
export UV_LINK_MODE := copy

.DEFAULT_GOAL := help

##@ Help
.PHONY: help
help: ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)


##@ Development
.PHONY: dev
dev: ## Run dev server (backend + frontend watch)
	@npm run dev

.PHONY: install
install: ## Install all dependencies
	@uv sync
	@npm install


##@ Environment
.PHONY: env
env: ## Set up development environment
	@echo "Setting up development environment..."
	@test -d .venv || uv venv
	@uv pip install -e '.[dev]'
	@npm install
	@echo "✓ Development environment ready"

.PHONY: clean
clean: ## Clean up build artifacts
	@echo "Cleaning up..."
	@rm -rf dist
	@rm -rf lence.egg-info
	@rm -rf .venv/
	@rm -rf .ruff_cache/
	@rm -rf node_modules/
	@rm -f lence/static/*.js lence/static/*.js.map
	@rm -rf tmp/pycache
	@find . -name "*~" -delete
	@echo "Cleaned up"


##@ Compiling
.PHONY: build-frontend
build-frontend: ## Build frontend assets
	@echo "Building frontend..."
	@npm ci && npm run build
	@echo "✓ Frontend built"

.PHONY: build
build: build-frontend ## Build Python package
	@echo "Building package..."
	@uv build
	@echo "✓ Package built"


##@ Linting / Formatting
.PHONY: format
format: ## Format code with ruff
	@echo "Formatting code..."
	@uv run ruff format lence/

.PHONY: lint
lint: ## Check code style with ruff
	@echo "Checking code style..."
	@uv run ruff check lence/

.PHONY: lint-fix
lint-fix: ## Fix code style issues automatically
	@echo "Fixing code style..."
	@uv run ruff check --fix lence/


##@ Testing
.PHONY: test
test: ## Run all tests (backend + frontend)
	@uv run pytest
	@npm run test

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	@uv run pytest --watch
