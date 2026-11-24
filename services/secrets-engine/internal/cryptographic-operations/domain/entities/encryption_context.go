package entities

import (
	"regexp"
	"strings"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
)

var uuidShape = regexp.MustCompile(`\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z`)

// EncryptionContext says where a secret belongs. A ciphertext can only be
// opened in the context it was created in.
type EncryptionContext struct {
	projectID, environmentID, secretID string
}

func NewEncryptionContext(projectID, environmentID, secretID string) (EncryptionContext, error) {
	ids := []string{strings.ToLower(projectID), strings.ToLower(environmentID), strings.ToLower(secretID)}
	for _, id := range ids {
		if !uuidShape.MatchString(id) {
			return EncryptionContext{}, exceptions.ErrInvalidContext
		}
	}
	return EncryptionContext{ids[0], ids[1], ids[2]}, nil
}

// AAD is unambiguous because every identifier has a fixed shape without separators.
func (c EncryptionContext) AAD() []byte {
	return []byte("minivault:v1|project=" + c.projectID + "|environment=" + c.environmentID + "|secret=" + c.secretID)
}
