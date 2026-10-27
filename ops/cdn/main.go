package main

import (
	"log/slog"
	"net/http"
	"os"
	"time"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	cfg := loadConfig()
	if err := ensureDirs(cfg.OriginDir, cfg.CacheDir); err != nil {
		log.Error("mkdir", "err", err)
		os.Exit(1)
	}
	srv, err := newServer(cfg, log)
	if err != nil {
		log.Error("cdn", "err", err)
		os.Exit(1)
	}

	httpServer := &http.Server{
		Addr:              cfg.Listen,
		Handler:           srv.routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Info("listen",
		"addr", cfg.Listen,
		"public", cfg.PublicURL,
		"pull", cfg.PullOrigin,
		"origin", cfg.OriginDir,
		"cache", cfg.CacheDir,
	)
	if err := httpServer.ListenAndServe(); err != nil {
		log.Error("listen", "err", err)
		os.Exit(1)
	}
}
