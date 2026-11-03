package main

import (
	"log/slog"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/davidbyttow/govips/v2/vips"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	cfg, err := loadConfig()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}
	if err := ensureDirs(cfg.OriginDir, cfg.CacheDir); err != nil {
		log.Error("mkdir", "err", err)
		os.Exit(1)
	}

	vips.Startup(&vips.Config{
		ConcurrencyLevel: runtime.NumCPU(),
	})
	defer vips.Shutdown()

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
