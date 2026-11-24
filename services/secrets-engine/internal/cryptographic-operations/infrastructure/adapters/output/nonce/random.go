// Package nonce generates nonces from the operating system's CSPRNG.
package nonce

import (
	"crypto/rand"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/ports/output"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/valueobjects"
)

type Random struct{}

var _ output.NonceGenerator = Random{}

func (Random) Next() (valueobjects.Nonce, error) {
	raw := make([]byte, valueobjects.NonceSize)
	if _, err := rand.Read(raw); err != nil {
		return valueobjects.Nonce{}, err
	}
	return valueobjects.NewNonce(raw)
}
