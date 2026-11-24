// Package keymanagement provides encryption keys. This development adapter reads
// them from configuration; a KMS or HSM adapter would implement the same port.
package keymanagement

import (
	"context"
	"fmt"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/ports/output"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/valueobjects"
)

type StaticKeyProvider struct {
	keys   map[uint32]valueobjects.EncryptionKey
	active valueobjects.EncryptionKey
}

var _ output.KeyProvider = (*StaticKeyProvider)(nil)

func NewStaticKeyProvider(material map[uint32][]byte, activeVersion uint32) (*StaticKeyProvider, error) {
	keys := make(map[uint32]valueobjects.EncryptionKey, len(material))
	for number, raw := range material {
		version, err := valueobjects.NewKeyVersion(number)
		if err != nil {
			return nil, err
		}
		key, err := valueobjects.NewEncryptionKey(version, raw)
		if err != nil {
			return nil, err
		}
		keys[number] = key
	}
	active, ok := keys[activeVersion]
	if !ok {
		return nil, fmt.Errorf("active version %d: %w", activeVersion, exceptions.ErrUnknownKeyVersion)
	}
	return &StaticKeyProvider{keys, active}, nil
}

func (p *StaticKeyProvider) Active(context.Context) (valueobjects.EncryptionKey, error) {
	return p.active, nil
}

func (p *StaticKeyProvider) ByVersion(_ context.Context, version valueobjects.KeyVersion) (valueobjects.EncryptionKey, error) {
	key, ok := p.keys[version.Value()]
	if !ok {
		return valueobjects.EncryptionKey{}, exceptions.ErrUnknownKeyVersion
	}
	return key, nil
}
