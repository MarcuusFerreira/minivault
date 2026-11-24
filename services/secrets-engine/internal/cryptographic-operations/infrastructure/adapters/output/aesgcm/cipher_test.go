package aesgcm_test

import (
	"bytes"
	"encoding/hex"
	"testing"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/valueobjects"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/output/aesgcm"
)

func key(t *testing.T, fill byte) valueobjects.EncryptionKey {
	t.Helper()
	v, _ := valueobjects.NewKeyVersion(1)
	k, err := valueobjects.NewEncryptionKey(v, bytes.Repeat([]byte{fill}, 32))
	if err != nil {
		t.Fatal(err)
	}
	return k
}

func nonce(fill byte) valueobjects.Nonce {
	n, _ := valueobjects.NewNonce(bytes.Repeat([]byte{fill}, 12))
	return n
}

// Test case 14 of the GCM specification (McGrew and Viega).
func TestKnownAnswer(t *testing.T) {
	got, err := aesgcm.New().Seal(key(t, 0), nonce(0), make([]byte, 16), nil)
	if err != nil {
		t.Fatal(err)
	}
	if want := "cea7403d4d606b6e074ec5d3baf39d18d0d1c8a799996bf0265b98b5d48ab919"; hex.EncodeToString(got.Bytes()) != want {
		t.Fatalf("got %x", got.Bytes())
	}
}

func TestRoundTrip(t *testing.T) {
	for name, plaintext := range map[string][]byte{
		"empty": {}, "one byte": {7}, "maximum": bytes.Repeat([]byte{1}, 32768), "invalid UTF-8": {0xff, 0xfe, 0x00},
	} {
		c := aesgcm.New()
		ct, err := c.Seal(key(t, 1), nonce(2), plaintext, []byte("aad"))
		if err != nil {
			t.Fatal(name, err)
		}
		got, err := c.Open(key(t, 1), nonce(2), ct, []byte("aad"))
		if err != nil || !bytes.Equal(got, plaintext) {
			t.Fatal(name, err)
		}
	}
}

func TestEveryTamperedByteIsRejected(t *testing.T) {
	c := aesgcm.New()
	ct, _ := c.Seal(key(t, 1), nonce(2), []byte("secret value"), []byte("aad"))
	for i := range ct.Bytes() {
		raw := ct.Bytes()
		raw[i] ^= 1
		bad, _ := valueobjects.NewCiphertext(raw)
		if _, err := c.Open(key(t, 1), nonce(2), bad, []byte("aad")); err == nil {
			t.Fatalf("ciphertext byte %d", i)
		}
	}
	for i := range 12 {
		raw := nonce(2).Bytes()
		raw[i] ^= 1
		bad, _ := valueobjects.NewNonce(raw)
		if _, err := c.Open(key(t, 1), bad, ct, []byte("aad")); err == nil {
			t.Fatalf("nonce byte %d", i)
		}
	}
	if _, err := c.Open(key(t, 1), nonce(2), ct, []byte("other")); err == nil {
		t.Fatal("other AAD accepted")
	}
	if _, err := c.Open(key(t, 3), nonce(2), ct, []byte("aad")); err == nil {
		t.Fatal("other key accepted")
	}
}
