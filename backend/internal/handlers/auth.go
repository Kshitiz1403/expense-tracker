package handlers

import (
	"expense-tracker/internal/config"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	cfg *config.AuthConfig
}

func NewAuthHandler(cfg *config.AuthConfig) *AuthHandler {
	return &AuthHandler{cfg: cfg}
}

// Login authenticates the user and returns a JWT token
// POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
		return
	}

	// Validate username
	if input.Username != h.cfg.AdminUsername {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Validate password against bcrypt hash
	if err := bcrypt.CompareHashAndPassword([]byte(h.cfg.AdminPassword), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Sign JWT
	expiry := time.Duration(h.cfg.JWTExpiryHours) * time.Hour
	claims := jwt.MapClaims{
		"sub": input.Username,
		"exp": time.Now().Add(expiry).Unix(),
		"iat": time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}
