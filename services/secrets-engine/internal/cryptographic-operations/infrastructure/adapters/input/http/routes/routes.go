package routes

import (
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/ports/input"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/input/http/handlers"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/input/http/middleware"
)

const maxBody = 64 * 1024

// Dependencies are the collaborators the HTTP adapter needs.
type Dependencies struct {
	AuthToken string
	Encrypt   input.EncryptSecret
	Decrypt   input.DecryptSecret
	Logger    *slog.Logger
}

func New(deps Dependencies) *gin.Engine {
	logger := deps.Logger
	if logger == nil {
		logger = slog.New(slog.DiscardHandler)
	}
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	_ = engine.SetTrustedProxies(nil)
	engine.GET("/health", handlers.Health)

	internal := engine.Group("/internal/v1",
		middleware.CorrelationID, middleware.RequestLog(logger), middleware.Recover(logger),
		middleware.NoStore, middleware.ServiceAuth(deps.AuthToken), middleware.BodyLimit(maxBody))
	internal.POST("/encrypt", handlers.Encrypt(deps.Encrypt))
	internal.POST("/decrypt", handlers.Decrypt(deps.Decrypt))
	return engine
}
