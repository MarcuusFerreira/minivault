package valueobjects

import "github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"

type KeyVersion struct{ value uint32 }

func NewKeyVersion(value uint32) (KeyVersion, error) {
	if value == 0 {
		return KeyVersion{}, exceptions.ErrInvalidKeyVersion
	}
	return KeyVersion{value}, nil
}

func (v KeyVersion) Value() uint32 { return v.value }
