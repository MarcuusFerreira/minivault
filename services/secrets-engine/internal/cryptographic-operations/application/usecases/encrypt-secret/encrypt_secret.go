package encryptsecret

import (
	"context"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/dto"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/ports/input"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/ports/output"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/entities"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
)

const maxPlaintext = 32768

type UseCase struct {
	cipher output.Cipher
	keys   output.KeyProvider
	nonces output.NonceGenerator
}

var _ input.EncryptSecret = (*UseCase)(nil)

func New(cipher output.Cipher, keys output.KeyProvider, nonces output.NonceGenerator) *UseCase {
	return &UseCase{cipher, keys, nonces}
}

func (u *UseCase) Execute(ctx context.Context, cmd dto.EncryptCommand) (dto.EncryptResult, error) {
	if len(cmd.Plaintext) > maxPlaintext {
		return dto.EncryptResult{}, exceptions.ErrPlaintextTooLarge
	}
	encryption, err := entities.NewEncryptionContext(cmd.ProjectID, cmd.EnvironmentID, cmd.SecretID)
	if err != nil {
		return dto.EncryptResult{}, err
	}
	key, err := u.keys.Active(ctx)
	if err != nil {
		return dto.EncryptResult{}, err
	}
	nonce, err := u.nonces.Next()
	if err != nil {
		return dto.EncryptResult{}, err
	}
	ciphertext, err := u.cipher.Seal(key, nonce, cmd.Plaintext, encryption.AAD())
	if err != nil {
		return dto.EncryptResult{}, err
	}
	return dto.EncryptResult{Ciphertext: ciphertext.Bytes(), Nonce: nonce.Bytes(), KeyVersion: key.Version().Value()}, nil
}
