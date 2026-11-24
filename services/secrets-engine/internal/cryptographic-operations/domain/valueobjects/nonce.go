package valueobjects

import (
	"slices"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
)

const NonceSize = 12

type Nonce struct{ value []byte }

func NewNonce(raw []byte) (Nonce, error) {
	if len(raw) != NonceSize {
		return Nonce{}, exceptions.ErrInvalidNonce
	}
	return Nonce{slices.Clone(raw)}, nil
}

func (n Nonce) Bytes() []byte { return slices.Clone(n.value) }
