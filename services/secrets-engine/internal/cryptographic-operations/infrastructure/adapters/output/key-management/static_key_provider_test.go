package keymanagement_test

import (
	"context"
	"errors"
	"testing"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/valueobjects"
	keymanagement "github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/output/key-management"
)

func TestProvider(t *testing.T) {
	keys := map[uint32][]byte{1: make([]byte, 32), 2: make([]byte, 32)}
	p, err := keymanagement.NewStaticKeyProvider(keys, 2)
	if err != nil {
		t.Fatal(err)
	}
	if active, _ := p.Active(context.Background()); active.Version().Value() != 2 {
		t.Fatal("wrong active key")
	}
	for version, want := range map[uint32]error{1: nil, 2: nil, 3: exceptions.ErrUnknownKeyVersion} {
		v, _ := valueobjects.NewKeyVersion(version)
		if _, err := p.ByVersion(context.Background(), v); !errors.Is(err, want) {
			t.Fatal(version, err)
		}
	}
	if _, err := keymanagement.NewStaticKeyProvider(keys, 3); err == nil {
		t.Fatal("an active version without key must be refused")
	}
	if _, err := keymanagement.NewStaticKeyProvider(map[uint32][]byte{1: make([]byte, 16)}, 1); !errors.Is(err, exceptions.ErrInvalidKey) {
		t.Fatal(err)
	}
}
