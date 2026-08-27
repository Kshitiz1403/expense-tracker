package handlers

import (
	"encoding/json"
	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DataSourceHandler struct {
	dsRepo     *repository.DataSourceRepository
	apiBaseURL string
}

func NewDataSourceHandler(dsRepo *repository.DataSourceRepository, apiBaseURL string) *DataSourceHandler {
	return &DataSourceHandler{dsRepo: dsRepo, apiBaseURL: apiBaseURL}
}

// smsGatewayConfig holds the fields we store for an SMS gateway data source.
type smsGatewayConfig struct {
	DeviceID string `json:"deviceId"`
}

// gatewayImportEntry is a single entry in the importable config JSON array.
type gatewayImportEntry struct {
	Key                 string `json:"key"`
	Sender              string `json:"sender"`
	IsSenderRegex       bool   `json:"is_sender_regex"`
	SMSFilter           string `json:"sms_filter"`
	URL                 string `json:"url"`
	SimSlot             int    `json:"sim_slot"`
	Template            string `json:"template"`
	Headers             string `json:"headers"`
	RetriesNumber       int    `json:"retries_number"`
	IgnoreSSL           bool   `json:"ignore_ssl"`
	ChunkedMode         bool   `json:"chunked_mode"`
	IsSMSEnabled        bool   `json:"is_sms_enabled"`
	SignHMACSHA256      bool   `json:"sign_hmac_sha256"`
	SignHMACSHA256Secret string `json:"sign_hmac_sha256_secret"`
	StoreFailed         bool   `json:"store_failed"`
	LocalMode           bool   `json:"local_mode"`
}

// List returns all data sources.
func (h *DataSourceHandler) List(c *gin.Context) {
	sources, err := h.dsRepo.List()
	if err != nil {
		log.Printf("Error listing data sources: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch data sources"})
		return
	}
	c.JSON(http.StatusOK, sources)
}

// Create registers a new SMS gateway data source.
func (h *DataSourceHandler) Create(c *gin.Context) {
	var body struct {
		DeviceID string `json:"deviceId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "deviceId is required"})
		return
	}
	body.DeviceID = strings.TrimSpace(body.DeviceID)
	if body.DeviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "deviceId cannot be blank"})
		return
	}

	cfg := smsGatewayConfig{DeviceID: body.DeviceID}
	cfgJSON, err := json.Marshal(cfg)
	if err != nil {
		log.Printf("Error marshaling config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error"})
		return
	}
	cfgStr := string(cfgJSON)

	ds := &models.DataSource{
		Type:   "sms",
		Name:   body.DeviceID,
		Status: "connected",
		Config: &cfgStr,
	}
	if err := h.dsRepo.Create(ds); err != nil {
		log.Printf("Error creating data source: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create data source"})
		return
	}

	c.JSON(http.StatusCreated, ds)
}

// DownloadSMSConfig returns the importable JSON config for the SMS Forwarder app.
func (h *DataSourceHandler) DownloadSMSConfig(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data source ID"})
		return
	}

	ds, err := h.dsRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data source not found"})
		return
	}
	if ds.Type != "sms" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Config download only supported for SMS sources"})
		return
	}

	var cfg smsGatewayConfig
	if ds.Config != nil {
		if err := json.Unmarshal([]byte(*ds.Config), &cfg); err != nil {
			log.Printf("Error parsing data source config: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Corrupt config"})
			return
		}
	}

	entry := buildGatewayEntry(cfg.DeviceID, h.apiBaseURL)
	out, _ := json.MarshalIndent([]gatewayImportEntry{entry}, "", "  ")

	c.Header("Content-Disposition", "attachment; filename=\"sms-gateway-config.json\"")
	c.Data(http.StatusOK, "application/json", out)
}

func buildGatewayEntry(deviceID, apiBaseURL string) gatewayImportEntry {
	key := fmt.Sprintf("%d_%06d", time.Now().UnixMilli(), rand.Intn(1_000_000))
	webhookURL := strings.TrimRight(apiBaseURL, "/") + "/api/webhooks/sms/v2"
	template := fmt.Sprintf(
		`{"from":"%%from%%","text":"%%text%%","sentStamp":%%sentStamp%%,"receivedStamp":%%receivedStamp%%,"sim":"%%sim%%","deviceId":%q}`,
		deviceID,
	)

	return gatewayImportEntry{
		Key:                 key,
		Sender:              "*",
		IsSenderRegex:       false,
		SMSFilter:           "",
		URL:                 webhookURL,
		SimSlot:             0,
		Template:            template,
		Headers:             `{"User-agent":"SMS Forwarder App"}`,
		RetriesNumber:       10,
		IgnoreSSL:           false,
		ChunkedMode:         false,
		IsSMSEnabled:        true,
		SignHMACSHA256:      false,
		SignHMACSHA256Secret: "",
		StoreFailed:         false,
		LocalMode:           false,
	}
}
