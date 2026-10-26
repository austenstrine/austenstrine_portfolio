package main

import (
	"os"
	"strconv"
	"strings"
	"time"
)

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

func loadConfig() config {
	return config{
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
