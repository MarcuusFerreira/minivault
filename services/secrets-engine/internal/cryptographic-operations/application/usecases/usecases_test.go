package usecases_test

import (
	"context"
	"errors"
	"testing"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/dto"
	decryptsecret "github.com/minivault/secrets-engine/internal/cryptographic-operations/application/usecases/decrypt-secret"
	encryptsecret "github.com/minivault/secrets-engine/internal/cryptographic-operations/application/usecases/encrypt-secret"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/valueobjects"
)

const id = "11111111-1111-4111-8111-111111111111"

type fakeCipher struct {
	sealed, opened bool
	aad            string
	version        uint32
	err            error
}

func (f *fakeCipher) Seal(key valueobjects.EncryptionKey, _ valueobjects.Nonce, _, aad []byte) (valueobjects.Ciphertext, error) {
	f.sealed, f.aad, f.version = true, string(aad), key.Version().Value()
	ct, _ := valueobjects.NewCiphertext(make([]byte, 16))
	return ct, f.err
}

func (f *fakeCipher) Open(key valueobjects.EncryptionKey, _ valueobjects.Nonce, _ valueobjects.Ciphertext, aad []byte) ([]byte, error) {
	f.opened, f.aad, f.version = true, string(aad), key.Version().Value()
	return []byte("plain"), f.err
}

type fakeKeys struct{ active uint32 }

func makeKey(version uint32) valueobjects.EncryptionKey {
	v, _ := valueobjects.NewKeyVersion(version)
	key, _ := valueobjects.NewEncryptionKey(v, make([]byte, 32))
	return key
}

func (f fakeKeys) Active(context.Context) (valueobjects.EncryptionKey, error) { return makeKey(f.active), nil }

func (f fakeKeys) ByVersion(_ context.Context, v valueobjects.KeyVersion) (valueobjects.EncryptionKey, error) {
	if v.Value() > f.active {
		return valueobjects.EncryptionKey{}, exceptions.ErrUnknownKeyVersion
	}
	return makeKey(v.Value()), nil
}

type fakeNonces struct{ err error }

func (f fakeNonces) Next() (valueobjects.Nonce, error) {
	n, _ := valueobjects.NewNonce(make([]byte, 12))
	return n, f.err
}

func encrypt(c *fakeCipher, nonceErr error, size int) (dto.EncryptResult, error) {
	return encryptsecret.New(c, fakeKeys{active: 2}, fakeNonces{nonceErr}).Execute(context.Background(),
		dto.EncryptCommand{ProjectID: id, EnvironmentID: id, SecretID: id, Plaintext: make([]byte, size)})
}

func TestEncryptUsesActiveKeyAndContext(t *testing.T) {
	c := &fakeCipher{}
	result, err := encrypt(c, nil, 32768)
	if err != nil || result.KeyVersion != 2 || len(result.Nonce) != 12 || len(result.Ciphertext) != 16 {
		t.Fatal(result, err)
	}
	if c.version != 2 || c.aad != "minivault:v1|project="+id+"|environment="+id+"|secret="+id {
		t.Fatal(c.version, c.aad)
	}
}

func TestEncryptRejectsLargePlaintext(t *testing.T) {
	c := &fakeCipher{}
	if _, err := encrypt(c, nil, 32769); !errors.Is(err, exceptions.ErrPlaintextTooLarge) || c.sealed {
		t.Fatal(err)
	}
}

func TestEncryptStopsWithoutNonce(t *testing.T) {
	c := &fakeCipher{}
	if _, err := encrypt(c, errors.New("no entropy"), 1); err == nil || c.sealed {
		t.Fatal("must not encrypt without a fresh nonce")
	}
}

func decrypt(c *fakeCipher, change func(*dto.DecryptCommand)) (dto.DecryptResult, error) {
	cmd := dto.DecryptCommand{ProjectID: id, EnvironmentID: id, SecretID: id, Ciphertext: make([]byte, 16), Nonce: make([]byte, 12), KeyVersion: 1}
	change(&cmd)
	return decryptsecret.New(c, fakeKeys{active: 2}).Execute(context.Background(), cmd)
}

func TestDecryptUsesTheRecordedKeyVersion(t *testing.T) {
	c := &fakeCipher{}
	result, err := decrypt(c, func(*dto.DecryptCommand) {})
	if err != nil || string(result.Plaintext) != "plain" || c.version != 1 {
		t.Fatal(err)
	}
}

func TestDecryptErrors(t *testing.T) {
	cases := map[string]struct {
		change func(*dto.DecryptCommand)
		want   error
	}{
		"unknown version": {func(c *dto.DecryptCommand) { c.KeyVersion = 9 }, exceptions.ErrUnknownKeyVersion},
		"version zero":    {func(c *dto.DecryptCommand) { c.KeyVersion = 0 }, exceptions.ErrInvalidKeyVersion},
		"bad nonce":       {func(c *dto.DecryptCommand) { c.Nonce = c.Nonce[:11] }, exceptions.ErrInvalidNonce},
		"bad ciphertext":  {func(c *dto.DecryptCommand) { c.Ciphertext = nil }, exceptions.ErrInvalidCiphertext},
		"bad context":     {func(c *dto.DecryptCommand) { c.SecretID = "x" }, exceptions.ErrInvalidContext},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			c := &fakeCipher{}
			if _, err := decrypt(c, tc.change); !errors.Is(err, tc.want) || c.opened {
				t.Fatal(err)
			}
		})
	}
	c := &fakeCipher{err: errors.New("detail of the cipher")}
	if _, err := decrypt(c, func(*dto.DecryptCommand) {}); err != exceptions.ErrDecryptionFailed {
		t.Fatal("cipher errors must become ErrDecryptionFailed without detail", err)
	}
}
