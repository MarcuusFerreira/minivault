package valueobjects_test

import (
	"bytes"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"testing"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/valueobjects"
)

func TestNonceLength(t *testing.T) {
	for size, want := range map[int]error{11: exceptions.ErrInvalidNonce, 12: nil, 13: exceptions.ErrInvalidNonce} {
		if _, err := valueobjects.NewNonce(make([]byte, size)); !errors.Is(err, want) {
			t.Errorf("%d bytes: got %v", size, err)
		}
	}
}

func TestCiphertextHoldsAtLeastTheTag(t *testing.T) {
	for size, want := range map[int]error{0: exceptions.ErrInvalidCiphertext, 15: exceptions.ErrInvalidCiphertext, 16: nil} {
		if _, err := valueobjects.NewCiphertext(make([]byte, size)); !errors.Is(err, want) {
			t.Errorf("%d bytes: got %v", size, err)
		}
	}
}

func TestKeyVersionStartsAtOne(t *testing.T) {
	if _, err := valueobjects.NewKeyVersion(0); !errors.Is(err, exceptions.ErrInvalidKeyVersion) {
		t.Fatal(err)
	}
	if v, err := valueobjects.NewKeyVersion(1); err != nil || v.Value() != 1 {
		t.Fatal(err)
	}
}

func TestKeyLength(t *testing.T) {
	v, _ := valueobjects.NewKeyVersion(1)
	for size, want := range map[int]error{16: exceptions.ErrInvalidKey, 31: exceptions.ErrInvalidKey, 32: nil, 33: exceptions.ErrInvalidKey} {
		if _, err := valueobjects.NewEncryptionKey(v, make([]byte, size)); !errors.Is(err, want) {
			t.Errorf("%d bytes: got %v", size, err)
		}
	}
}

func TestKeyCannotBePrinted(t *testing.T) {
	v, _ := valueobjects.NewKeyVersion(1)
	material := []byte(strings.Repeat("K", 32))
	key, _ := valueobjects.NewEncryptionKey(v, material)
	var log bytes.Buffer
	slog.New(slog.NewJSONHandler(&log, nil)).Info("x", "key", key, "pointer", &key)
	out := fmt.Sprintf("%v %+v %#v %s %v %d %x", key, key, key, key, &key, key, key) + log.String()
	for _, leak := range []string{"KKKK", "75 75", "4b4b", "0x4b"} {
		if strings.Contains(out, leak) {
			t.Fatalf("key material printed as %q", leak)
		}
	}
}

func TestValuesAreCopied(t *testing.T) {
	raw := make([]byte, 12)
	nonce, _ := valueobjects.NewNonce(raw)
	raw[0] = 9
	if nonce.Bytes()[0] != 0 {
		t.Fatal("a value object must not change with its input")
	}
}
