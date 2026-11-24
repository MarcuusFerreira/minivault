package routes

import (
	"github.com/gin-gonic/gin"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/input/http/handlers"
)

// Dependencies are the collaborators the HTTP adapter needs.
type Dependencies struct{}

func New(_ Dependencies) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	_ = engine.SetTrustedProxies(nil)
	engine.GET("/health", handlers.Health)
	return engine
}
