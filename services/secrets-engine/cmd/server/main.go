package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	decryptsecret "github.com/minivault/secrets-engine/internal/cryptographic-operations/application/usecases/decrypt-secret"
	encryptsecret "github.com/minivault/secrets-engine/internal/cryptographic-operations/application/usecases/encrypt-secret"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/input/http/routes"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/output/aesgcm"
	keymanagement "github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/output/key-management"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/output/nonce"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/config"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/server"
)

func main() {
	probe := flag.Bool("healthcheck", false, "probe a running server and exit")
	flag.Parse()
	if *probe {
		os.Exit(healthcheck())
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("engine stopped", "error", err.Error())
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}
	keys, err := keymanagement.NewStaticKeyProvider(cfg.MasterKeys, cfg.ActiveKeyVersion)
	if err != nil {
		return fmt.Errorf("invalid keys: %w", err)
	}
	cipher := aesgcm.New()
	handler := routes.New(routes.Dependencies{
		AuthToken: cfg.AuthToken,
		Encrypt:   encryptsecret.New(cipher, keys, nonce.Random{}),
		Decrypt:   decryptsecret.New(cipher, keys),
		Logger:    logger,
	})

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	logger.Info("engine starting", "addr", cfg.Addr, "activeKeyVersion", cfg.ActiveKeyVersion)
	return server.Run(ctx, cfg.Addr, handler)
}

// healthcheck exists because the distroless image has no shell or HTTP client.
func healthcheck() int {
	addr := os.Getenv("ENGINE_ADDR")
	if addr == "" {
		addr = ":8081"
	}
	client := http.Client{Timeout: 2 * time.Second}
	res, err := client.Get("http://127.0.0.1" + addr + "/health")
	if err != nil {
		return 1
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}
