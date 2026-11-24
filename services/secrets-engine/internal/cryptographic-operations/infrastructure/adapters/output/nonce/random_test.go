package nonce_test

import (
	"testing"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/output/nonce"
)

func TestNoncesAreUnique(t *testing.T) {
	seen := make(map[string]bool)
	for range 10000 {
		n, err := nonce.Random{}.Next()
		if err != nil || seen[string(n.Bytes())] {
			t.Fatal("repeated nonce", err)
		}
		seen[string(n.Bytes())] = true
	}
}
