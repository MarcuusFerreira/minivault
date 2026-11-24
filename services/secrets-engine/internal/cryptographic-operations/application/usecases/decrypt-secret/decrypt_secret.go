package decryptsecret

import (
	"context"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/dto"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/ports/input"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/ports/output"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/entities"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/valueobjects"
)

type UseCase struct {
	cipher output.Cipher
	keys   output.KeyProvider
}

var _ input.DecryptSecret = (*UseCase)(nil)

func New(cipher output.Cipher, keys output.KeyProvider) *UseCase {
	return &UseCase{cipher, keys}
}

func (u *UseCase) Execute(ctx context.Context, cmd dto.DecryptCommand) (dto.DecryptResult, error) {
	encryption, err := entities.NewEncryptionContext(cmd.ProjectID, cmd.EnvironmentID, cmd.SecretID)
	if err != nil {
		return dto.DecryptResult{}, err
	}
	nonce, err := valueobjects.NewNonce(cmd.Nonce)
	if err != nil {
		return dto.DecryptResult{}, err
	}
	ciphertext, err := valueobjects.NewCiphertext(cmd.Ciphertext)
	if err != nil {
		return dto.DecryptResult{}, err
	}
	version, err := valueobjects.NewKeyVersion(cmd.KeyVersion)
	if err != nil {
		return dto.DecryptResult{}, err
	}
	key, err := u.keys.ByVersion(ctx, version)
	if err != nil {
		return dto.DecryptResult{}, err
	}
	plaintext, err := u.cipher.Open(key, nonce, ciphertext, encryption.AAD())
	if err != nil {
		// Why it failed is of no use to a caller and of some use to an attacker.
		return dto.DecryptResult{}, exceptions.ErrDecryptionFailed
	}
	return dto.DecryptResult{Plaintext: plaintext}, nil
}
