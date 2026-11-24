// Package server runs the HTTP server with safe timeouts and graceful shutdown.
package server

import (
	"context"
	"errors"
	"net/http"
	"time"
)

const shutdownTimeout = 10 * time.Second

// Run serves until ctx is cancelled, then drains in-flight requests.
func Run(ctx context.Context, addr string, handler http.Handler) error {
	srv := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	failed := make(chan error, 1)
	go func() { failed <- srv.ListenAndServe() }()
	select {
	case err := <-failed:
		return err
	case <-ctx.Done():
		drain, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()
		if err := srv.Shutdown(drain); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	}
}
