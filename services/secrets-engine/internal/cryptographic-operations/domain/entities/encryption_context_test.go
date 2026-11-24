package entities_test

import (
	"errors"
	"testing"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/entities"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
)

const (
	project     = "11111111-1111-4111-8111-111111111111"
	environment = "22222222-2222-4222-8222-222222222222"
	secret      = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
)

func TestAADBindsProjectEnvironmentAndSecret(t *testing.T) {
	ctx, err := entities.NewEncryptionContext(project, environment, secret)
	if err != nil {
		t.Fatal(err)
	}
	want := "minivault:v1|project=" + project + "|environment=" + environment + "|secret=" + secret
	if got := string(ctx.AAD()); got != want {
		t.Fatalf("got %q", got)
	}
}

func TestIdentifiersAreCanonicalized(t *testing.T) {
	lower, _ := entities.NewEncryptionContext(project, environment, secret)
	upper, err := entities.NewEncryptionContext(project, environment, "AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE")
	if err != nil || string(lower.AAD()) != string(upper.AAD()) {
		t.Fatal("the same identifier in another case must give the same context")
	}
}

func TestRejectsIdentifiersThatAreNotUUIDs(t *testing.T) {
	for _, bad := range []string{"", "x", project + "|secret=1", project + "\n", "11111111111141118111111111111111"} {
		for position := range 3 {
			ids := []string{project, environment, secret}
			ids[position] = bad
			if _, err := entities.NewEncryptionContext(ids[0], ids[1], ids[2]); !errors.Is(err, exceptions.ErrInvalidContext) {
				t.Errorf("%q at %d: got %v", bad, position, err)
			}
		}
	}
}
