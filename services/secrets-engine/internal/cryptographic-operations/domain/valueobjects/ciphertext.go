package valueobjects

import (
	"slices"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
)

const tagSize = 16

// Ciphertext is encrypted data followed by its authentication tag.
type Ciphertext struct{ value []byte }

func NewCiphertext(raw []byte) (Ciphertext, error) {
	if len(raw) < tagSize {
		return Ciphertext{}, exceptions.ErrInvalidCiphertext
	}
	return Ciphertext{slices.Clone(raw)}, nil
}

func (c Ciphertext) Bytes() []byte { return slices.Clone(c.value) }
