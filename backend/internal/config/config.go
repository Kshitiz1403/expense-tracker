package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

const maxLLMFallbacks = 5

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	SMS      SMSConfig
	Frontend FrontendConfig
	LLM      LLMConfig
	Auth     AuthConfig
}

type AuthConfig struct {
	AdminUsername  string
	AdminPassword  string // bcrypt hash
	JWTSecret      string
	JWTExpiryHours int
}

type ServerConfig struct {
	Port    string
	GinMode string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
}

type SMSConfig struct {
	WebhookSecret string
	WebhookID     string
}

type LLMConfig struct {
	Provider  string // openai, anthropic, etc.
	APIKey    string
	Model     string
	Fallbacks []LLMConfig // ordered list of fallback providers
}

type FrontendConfig struct {
	URL string
}

func Load() *Config {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	return &Config{
		Server: ServerConfig{
			Port:    getEnv("PORT", "8080"),
			GinMode: getEnv("GIN_MODE", "debug"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", "expense_tracker_db"),
		},
		SMS: SMSConfig{
			WebhookSecret: getEnv("SMS_GATEWAY_SECRET", ""),
			WebhookID:     getEnv("SMS_GATEWAY_WEBHOOK_ID", ""),
		},
		LLM: LLMConfig{
			Provider:  getEnv("LLM_PROVIDER", "openai"),
			APIKey:    getEnv("LLM_API_KEY", ""),
			Model:     getEnv("LLM_MODEL", "gpt-4o-mini"),
			Fallbacks: loadLLMFallbacks(),
		},
		Frontend: FrontendConfig{
			URL: getEnv("FRONTEND_URL", "http://localhost:3001"),
		},
		Auth: AuthConfig{
			AdminUsername:  getEnv("ADMIN_USERNAME", "admin"),
			AdminPassword:  getEnv("ADMIN_PASSWORD", ""),
			JWTSecret:      getEnv("JWT_SECRET", "change-me-in-production"),
			JWTExpiryHours: getEnvInt("JWT_EXPIRY_HOURS", 168),
		},
	}
}

func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		c.Host, c.Port, c.User, c.Password, c.DBName,
	)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if n, err := strconv.Atoi(value); err == nil {
			return n
		}
	}
	return defaultValue
}

// loadLLMFallbacks reads up to maxLLMFallbacks fallback configs from env vars.
// Expected format: LLM_FALLBACK_1_PROVIDER, LLM_FALLBACK_1_API_KEY, LLM_FALLBACK_1_MODEL, etc.
func loadLLMFallbacks() []LLMConfig {
	var fallbacks []LLMConfig
	for i := 1; i <= maxLLMFallbacks; i++ {
		provider := os.Getenv(fmt.Sprintf("LLM_FALLBACK_%d_PROVIDER", i))
		if provider == "" {
			break
		}
		fallbacks = append(fallbacks, LLMConfig{
			Provider: provider,
			APIKey:   os.Getenv(fmt.Sprintf("LLM_FALLBACK_%d_API_KEY", i)),
			Model:    os.Getenv(fmt.Sprintf("LLM_FALLBACK_%d_MODEL", i)),
		})
	}
	return fallbacks
}
