package internal_test

import (
	"go/parser"
	"go/token"
	"io/fs"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

const modulePath = "github.com/minivault/secrets-engine"

// forbidden reports why a file in the given layer may not import path, or "".
func forbidden(layer, path string) string {
	internalImport := strings.HasPrefix(path, modulePath)
	standard := !strings.Contains(strings.SplitN(path, "/", 2)[0], ".")
	switch layer {
	case "domain":
		switch {
		case path == "net/http" || path == "database/sql":
			return "domain must not know about transport or databases"
		case internalImport && !strings.Contains(path, "/domain/"):
			return "domain must not depend on outer layers"
		case !internalImport && !standard:
			return "domain must use only the standard library"
		}
	case "application":
		switch {
		case path == "net/http" || path == "database/sql":
			return "application must not know about transport or databases"
		case path == "crypto/aes" || path == "crypto/cipher" || path == "crypto/rand":
			return "application must reach cryptography through output ports"
		case strings.Contains(path, "/infrastructure/"):
			return "application must not depend on infrastructure"
		case !internalImport && !standard:
			return "application must use only the standard library"
		}
	case "handlers":
		if strings.HasPrefix(path, "crypto/aes") || strings.HasPrefix(path, "crypto/cipher") || strings.Contains(path, "/adapters/output/") {
			return "handlers must reach cryptography through input ports"
		}
	}
	return ""
}

func layerOf(path string) string {
	path = filepath.ToSlash(path)
	for _, layer := range []string{"domain", "application", "handlers"} {
		if strings.Contains(path, "/"+layer+"/") {
			return layer
		}
	}
	return ""
}

func TestDependencyRule(t *testing.T) {
	err := filepath.WalkDir(".", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return err
		}
		file, err := parser.ParseFile(token.NewFileSet(), path, nil, parser.ImportsOnly)
		if err != nil {
			return err
		}
		for _, spec := range file.Imports {
			imported, _ := strconv.Unquote(spec.Path.Value)
			if reason := forbidden(layerOf(path), imported); reason != "" {
				t.Errorf("%s imports %s: %s", path, imported, reason)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

// The checker is only trustworthy if it is seen rejecting bad imports.
func TestDependencyRuleRejectsViolations(t *testing.T) {
	bad := [][2]string{
		{"domain", "github.com/gin-gonic/gin"},
		{"domain", "net/http"},
		{"domain", modulePath + "/internal/cryptographic-operations/application/dto"},
		{"application", "github.com/gin-gonic/gin"},
		{"application", "net/http"},
		{"application", "crypto/aes"},
		{"application", modulePath + "/internal/cryptographic-operations/infrastructure/config"},
		{"handlers", "crypto/cipher"},
		{"handlers", modulePath + "/internal/cryptographic-operations/infrastructure/adapters/output/aesgcm"},
	}
	for _, c := range bad {
		if forbidden(c[0], c[1]) == "" {
			t.Errorf("%s importing %s should be rejected", c[0], c[1])
		}
	}
	if reason := forbidden("application", modulePath+"/internal/cryptographic-operations/domain/entities"); reason != "" {
		t.Errorf("application may import domain, got %q", reason)
	}
}
