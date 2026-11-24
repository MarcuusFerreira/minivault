// Package output declares what the application needs.
package output

import (
	"context"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/valueobjects"
)

// Cipher is authenticated encryption with associated data.
type Cipher interface {
	Seal(key valueobjects.EncryptionKey, nonce valueobjects.Nonce, plaintext, aad []byte) (valueobjects.Ciphertext, error)
	Open(key valueobjects.EncryptionKey, nonce valueobjects.Nonce, ciphertext valueobjects.Ciphertext, aad []byte) ([]byte, error)
}

// KeyProvider is where a KMS or HSM would be plugged in.
type KeyProvider interface {
	Active(context.Context) (valueobjects.EncryptionKey, error)
	// ByVersion fails with ErrUnknownKeyVersion.
	ByVersion(context.Context, valueobjects.KeyVersion) (valueobjects.EncryptionKey, error)
}

// NonceGenerator returns a nonce never used before with any key.
type NonceGenerator interface {
	Next() (valueobjects.Nonce, error)
}
