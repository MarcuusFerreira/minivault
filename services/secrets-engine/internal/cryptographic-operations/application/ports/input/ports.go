// Package input declares what the application can do.
package input

import (
	"context"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/dto"
)

type EncryptSecret interface {
	Execute(context.Context, dto.EncryptCommand) (dto.EncryptResult, error)
}

type DecryptSecret interface {
	Execute(context.Context, dto.DecryptCommand) (dto.DecryptResult, error)
}
