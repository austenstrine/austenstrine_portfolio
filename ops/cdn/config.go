package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const localDevCDNToken = "local-cdn-dev"

type config struct {
	Listen     string
	PublicURL  string
	PullOrigin string
	OriginDir  string
	CacheDir   string
	Token      string
	MaxUpload  int64
	MaxPixels  int
	MaxDim     int
	PullTimeout time.Duration
}

func loadConfig() (config, error) {
	cfg := config{
		Listen:      env("CDN_LISTEN", ":8088"),
		PublicURL:   strings.TrimRight(env("CDN_PUBLIC_URL", env("NEXT_PUBLIC_CDN_URL", "http://127.0.0.1:8088")), "/"),
		PullOrigin:  strings.TrimRight(env("CDN_PULL_ORIGIN", "http://127.0.0.1:3000"), "/"),
		OriginDir:   env("CDN_ORIGIN_DIR", "./data/origin"),
		CacheDir:    env("CDN_CACHE_DIR", "./data/cache"),
		Token:       env("CDN_TOKEN", ""),
		MaxUpload:   envInt64("CDN_MAX_UPLOAD_BYTES", 32<<20),
		MaxPixels:   int(envInt64("CDN_MAX_PIXELS", 40_000_000)),
		MaxDim:      int(envInt64("CDN_MAX_DIM", 4096)),
		PullTimeout: time.Duration(envInt64("CDN_PULL_TIMEOUT_MS", 15000)) * time.Millisecond,
	}
	if err := cfg.validateProductionToken(); err != nil {
		return config{}, err
	}
	return cfg, nil
}

func (c config) validateProductionToken() error {
	if strings.TrimSpace(os.Getenv("NODE_ENV")) != "production" {
		return nil
	}
	token := strings.TrimSpace(c.Token)
	if token == "" || token == localDevCDNToken {
		return fmt.Errorf("CDN_TOKEN must be a strong random value when NODE_ENV=production (not empty or %q)", localDevCDNToken)
	}
	return nil
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envInt64(key string, fallback int64) int64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	n, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}
