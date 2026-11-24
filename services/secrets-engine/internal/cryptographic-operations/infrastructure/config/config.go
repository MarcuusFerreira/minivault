// Package config loads and validates the engine configuration. Error messages
// never include configured values, because most of them are secrets.
package config

import (
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

const (
	minTokenLength = 32
	keyLength      = 32
)

type Config struct {
	Addr             string
	AuthToken        string
	ActiveKeyVersion uint32
	MasterKeys       map[uint32][]byte
}

func Load(getenv func(string) string) (Config, error) {
	cfg := Config{Addr: getenv("ENGINE_ADDR"), AuthToken: getenv("ENGINE_AUTH_TOKEN")}
	if cfg.Addr == "" {
		cfg.Addr = ":8081"
	}
	if len(cfg.AuthToken) < minTokenLength {
		return Config{}, fmt.Errorf("ENGINE_AUTH_TOKEN must have at least %d characters", minTokenLength)
	}
	keys, err := parseKeys(getenv("MASTER_KEYS"))
	if err != nil {
		return Config{}, err
	}
	cfg.MasterKeys = keys
	active, err := strconv.ParseUint(getenv("ACTIVE_KEY_VERSION"), 10, 32)
	if err != nil {
		return Config{}, errors.New("ACTIVE_KEY_VERSION must be a positive integer")
	}
	cfg.ActiveKeyVersion = uint32(active)
	if _, ok := keys[cfg.ActiveKeyVersion]; !ok {
		return Config{}, errors.New("ACTIVE_KEY_VERSION has no matching entry in MASTER_KEYS")
	}
	return cfg, nil
}

func parseKeys(raw string) (map[uint32][]byte, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, errors.New("MASTER_KEYS is required")
	}
	keys := make(map[uint32][]byte)
	for i, entry := range strings.Split(raw, ",") {
		position := i + 1
		versionText, encoded, found := strings.Cut(strings.TrimSpace(entry), ":")
		if !found {
			return nil, fmt.Errorf("MASTER_KEYS entry %d must look like <version>:<base64 key>", position)
		}
		version, err := strconv.ParseUint(versionText, 10, 32)
		if err != nil || version == 0 {
			return nil, fmt.Errorf("MASTER_KEYS entry %d has an invalid version", position)
		}
		key, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			return nil, fmt.Errorf("MASTER_KEYS entry %d is not valid base64", position)
		}
		if len(key) != keyLength {
			return nil, fmt.Errorf("MASTER_KEYS entry %d must decode to %d bytes", position, keyLength)
		}
		if _, duplicate := keys[uint32(version)]; duplicate {
			return nil, fmt.Errorf("MASTER_KEYS entry %d repeats a version", position)
		}
		keys[uint32(version)] = key
	}
	return keys, nil
}
