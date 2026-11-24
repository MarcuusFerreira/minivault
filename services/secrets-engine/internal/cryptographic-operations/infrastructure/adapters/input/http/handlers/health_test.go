package handlers_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/input/http/routes"
)

func TestHealth(t *testing.T) {
	rec := httptest.NewRecorder()
	routes.New(routes.Dependencies{}).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rec.Code != http.StatusOK || rec.Body.String() != `{"status":"ok"}` {
		t.Fatalf("got %d %s", rec.Code, rec.Body)
	}
}
