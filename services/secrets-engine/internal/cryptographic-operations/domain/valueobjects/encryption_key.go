package valueobjects

import (
	"fmt"
	"log/slog"
	"slices"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
)

const (
	keySize  = 32
	redacted = "[REDACTED]"
)

// EncryptionKey is an AES-256 key that refuses to be printed.
type EncryptionKey struct {
	version  KeyVersion
	material []byte
}

func NewEncryptionKey(version KeyVersion, material []byte) (EncryptionKey, error) {
	if len(material) != keySize {
		return EncryptionKey{}, exceptions.ErrInvalidKey
	}
	return EncryptionKey{version, slices.Clone(material)}, nil
}

func (k EncryptionKey) Version() KeyVersion { return k.version }

// Material is for cipher adapters only.
func (k EncryptionKey) Material() []byte { return slices.Clone(k.material) }

// Format covers every fmt verb, including %x and %d, which ignore String.
func (k EncryptionKey) Format(state fmt.State, _ rune) { _, _ = state.Write([]byte(redacted)) }

func (k EncryptionKey) LogValue() slog.Value { return slog.StringValue(redacted) }
