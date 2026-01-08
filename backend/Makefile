.PHONY: build run test clean docker-build docker-up docker-down docker-logs deps

# Variables
BINARY_NAME=server
GO_FILES=$(shell find . -name '*.go' -type f)
BUILD_DIR=./build

# Build the application
build: deps
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@CGO_ENABLED=1 go build -o $(BUILD_DIR)/$(BINARY_NAME) ./cmd/server

# Run the application
run: build
	@echo "Running $(BINARY_NAME)..."
	@$(BUILD_DIR)/$(BINARY_NAME)

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	@go mod download
	@go mod tidy

# Run tests
test:
	@echo "Running tests..."
	@go test -v ./...

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@rm -f data/*.db

# Docker build
docker-build:
	@echo "Building Docker image..."
	@docker compose build

# Docker up
docker-up:
	@echo "Starting Docker containers..."
	@docker compose up -d

# Docker down
docker-down:
	@echo "Stopping Docker containers..."
	@docker compose down

# Docker logs
docker-logs:
	@docker compose logs -f backend

# Docker rebuild
docker-rebuild: docker-down docker-build docker-up
