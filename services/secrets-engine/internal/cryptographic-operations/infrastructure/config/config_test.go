package config_test

import (
	"encoding/base64"
	"strings"
	"testing"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/config"
)

var token = strings.Repeat("t", 32)

func key(size int) string {
	return base64.StdEncoding.EncodeToString([]byte(strings.Repeat("k", size)))
}

func load(keys, active, tok string) (config.Config, error) {
	env := map[string]string{"MASTER_KEYS": keys, "ACTIVE_KEY_VERSION": active, "ENGINE_AUTH_TOKEN": tok}
	return config.Load(func(name string) string { return env[name] })
}

func TestLoadAcceptsSeveralVersions(t *testing.T) {
	cfg, err := load("1:"+key(32)+",2:"+key(32), "2", token)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ActiveKeyVersion != 2 || len(cfg.MasterKeys) != 2 || len(cfg.MasterKeys[1]) != 32 || cfg.Addr != ":8081" {
		t.Fatal("unexpected configuration")
	}
}

func TestLoadRejectsInvalidConfiguration(t *testing.T) {
	cases := map[string][3]string{
		"16-byte key":           {"1:" + key(16), "1", token},
		"31-byte key":           {"1:" + key(31), "1", token},
		"bad base64":            {"1:%%%kkkk", "1", token},
		"missing separator":     {key(32), "1", token},
		"duplicate version":     {"1:" + key(32) + ",1:" + key(32), "1", token},
		"version zero":          {"0:" + key(32), "0", token},
		"active version absent": {"1:" + key(32), "2", token},
		"active not a number":   {"1:" + key(32), "x", token},
		"no keys":               {"", "1", token},
		"short token":           {"1:" + key(32), "1", strings.Repeat("t", 31)},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := load(c[0], c[1], c[2])
			if err == nil {
				t.Fatal("expected an error")
			}
			for _, secret := range []string{"kkkk", "a2tra2tr", strings.Repeat("t", 31)} {
				if strings.Contains(err.Error(), secret) {
					t.Fatal("error message leaks configuration material")
				}
			}
		})
	}
}
