// Package middleware holds the HTTP concerns shared by every route. Nothing here
// reads or logs a request or response body.
package middleware

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	correlationKey    = "correlationId"
	correlationHeader = "X-Correlation-Id"
)

var acceptedID = regexp.MustCompile(`\A[A-Za-z0-9-]{8,64}\z`)

func CorrelationID(c *gin.Context) {
	id := c.GetHeader(correlationHeader)
	if !acceptedID.MatchString(id) {
		id = rand.Text()
	}
	c.Set(correlationKey, id)
	c.Header(correlationHeader, id)
	c.Next()
}

// Fail ends the request with the standard error body.
func Fail(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{
		"code": code, "message": message, "correlationId": c.GetString(correlationKey),
	}})
}

func RequestLog(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		started := time.Now()
		c.Next()
		logger.Info("request",
			"correlationId", c.GetString(correlationKey), "method", c.Request.Method,
			"route", c.FullPath(), "status", c.Writer.Status(), "durationMs", time.Since(started).Milliseconds())
	}
}

// Recover hides the panic value, which could contain request data.
func Recover(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recover() != nil {
				logger.Error("panic recovered", "correlationId", c.GetString(correlationKey), "route", c.FullPath())
				Fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred.")
			}
		}()
		c.Next()
	}
}

func NoStore(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.Next()
}

// ServiceAuth admits only callers with the shared token. Hashing first makes the
// comparison independent of the length of what was sent.
func ServiceAuth(token string) gin.HandlerFunc {
	want := sha256.Sum256([]byte(token))
	return func(c *gin.Context) {
		sent, isBearer := strings.CutPrefix(c.GetHeader("Authorization"), "Bearer ")
		got := sha256.Sum256([]byte(sent))
		if token == "" || !isBearer || subtle.ConstantTimeCompare(got[:], want[:]) != 1 {
			Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "Service authentication failed.")
			return
		}
		c.Next()
	}
}

func BodyLimit(bytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, bytes)
		c.Next()
	}
}
