package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/dto"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/ports/input"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/input/http/middleware"
)

type encryptRequest struct {
	ProjectID     string  `json:"projectId"`
	EnvironmentID string  `json:"environmentId"`
	SecretID      string  `json:"secretId"`
	Plaintext     *[]byte `json:"plaintext"` // pointer: an empty value is valid, a missing one is not
}

type encryptResponse struct {
	Ciphertext []byte `json:"ciphertext"`
	Nonce      []byte `json:"nonce"`
	KeyVersion uint32 `json:"keyVersion"`
}

type decryptRequest struct {
	ProjectID     string `json:"projectId"`
	EnvironmentID string `json:"environmentId"`
	SecretID      string `json:"secretId"`
	Ciphertext    []byte `json:"ciphertext"`
	Nonce         []byte `json:"nonce"`
	KeyVersion    uint32 `json:"keyVersion"`
}

type decryptResponse struct {
	Plaintext []byte `json:"plaintext"`
}

func Encrypt(useCase input.EncryptSecret) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req encryptRequest
		if !decode(c, &req) {
			return
		}
		if req.Plaintext == nil {
			invalid(c)
			return
		}
		result, err := useCase.Execute(c.Request.Context(), dto.EncryptCommand{
			ProjectID: req.ProjectID, EnvironmentID: req.EnvironmentID, SecretID: req.SecretID, Plaintext: *req.Plaintext,
		})
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(http.StatusOK, encryptResponse(result))
	}
}

func Decrypt(useCase input.DecryptSecret) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req decryptRequest
		if !decode(c, &req) {
			return
		}
		result, err := useCase.Execute(c.Request.Context(), dto.DecryptCommand(req))
		if err != nil {
			fail(c, err)
			return
		}
		plaintext := result.Plaintext
		if plaintext == nil {
			plaintext = []byte{} // encoded as "", not null
		}
		c.JSON(http.StatusOK, decryptResponse{plaintext})
	}
}

// decode answers the request itself when the body is unacceptable. Decoder
// errors quote the input, so they are never returned or logged.
func decode(c *gin.Context, target any) bool {
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	err := decoder.Decode(target)
	if err == nil {
		if _, trailing := decoder.Token(); !errors.Is(trailing, io.EOF) {
			invalid(c)
			return false
		}
		return true
	}
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		middleware.Fail(c, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE", "The request body is too large.")
	} else {
		invalid(c)
	}
	return false
}

func invalid(c *gin.Context) {
	middleware.Fail(c, http.StatusBadRequest, "INVALID_REQUEST", "The request is malformed.")
}

func fail(c *gin.Context, err error) {
	switch {
	case errors.Is(err, exceptions.ErrPlaintextTooLarge):
		middleware.Fail(c, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE", err.Error())
	case errors.Is(err, exceptions.ErrUnknownKeyVersion):
		middleware.Fail(c, http.StatusUnprocessableEntity, "UNKNOWN_KEY_VERSION", "Unknown key version.")
	case errors.Is(err, exceptions.ErrDecryptionFailed):
		middleware.Fail(c, http.StatusUnprocessableEntity, "DECRYPTION_FAILED", "Decryption failed.")
	case errors.Is(err, exceptions.ErrInvalidContext), errors.Is(err, exceptions.ErrInvalidNonce),
		errors.Is(err, exceptions.ErrInvalidCiphertext), errors.Is(err, exceptions.ErrInvalidKeyVersion):
		invalid(c)
	default:
		middleware.Fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred.")
	}
}
