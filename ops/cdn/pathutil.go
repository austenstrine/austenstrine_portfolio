package main

import (
	"net/url"
	"path"
	"path/filepath"
	"strings"
)

func cleanRequestPath(raw string) (string, bool) {
	if raw == "" {
		return "/", true
	}
	decoded, err := url.PathUnescape(raw)
	if err != nil {
		return "", false
	}
	decoded = strings.ReplaceAll(decoded, "\\", "/")
	if !strings.HasPrefix(decoded, "/") {
		decoded = "/" + decoded
	}
	cleaned := path.Clean(decoded)
	if cleaned == "." {
		cleaned = "/"
	}
	if !strings.HasPrefix(cleaned, "/") || strings.Contains(cleaned, "..") {
		return "", false
	}
	return cleaned, true
}

func jailJoin(root, requestPath string) (string, bool) {
	cleaned, ok := cleanRequestPath(requestPath)
	if !ok || cleaned == "/" {
		return "", false
	}
	rel := strings.TrimPrefix(cleaned, "/")
	full := filepath.Join(root, filepath.FromSlash(rel))
	base := filepath.Clean(root)
	if full != base && !strings.HasPrefix(full, base+string(filepath.Separator)) {
		return "", false
	}
	return full, true
}

func variantKey(query url.Values) string {
	if len(query) == 0 {
		return "default"
	}
	parts := make([]string, 0, 5)
	for _, key := range []string{"w", "h", "fit", "fm", "q"} {
		value := strings.TrimSpace(query.Get(key))
		if value == "" {
			continue
		}
		parts = append(parts, key+"="+value)
	}
	if len(parts) == 0 {
		return "default"
	}
	return strings.Join(parts, "&")
}

func isPullable(requestPath string) bool {
	if strings.HasPrefix(requestPath, "/_next/static/") {
		return true
	}
	ext := strings.ToLower(path.Ext(requestPath))
	switch ext {
	case ".js", ".css", ".map",
		".woff", ".woff2", ".ttf", ".otf", ".eot",
		".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico",
		".mp4", ".webm", ".pdf", ".txt", ".json", ".xml":
		return true
	default:
		return false
	}
}

func isRaster(contentType, requestPath string) bool {
	switch strings.ToLower(contentType) {
	case "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp":
		return true
	}
	switch strings.ToLower(path.Ext(requestPath)) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp":
		return true
	default:
		return false
	}
}

func cacheControlFor(requestPath string) string {
	if strings.HasPrefix(requestPath, "/_next/static/") {
		return "public, max-age=31536000, immutable"
	}
	ext := strings.ToLower(path.Ext(requestPath))
	switch ext {
	case ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico",
		".woff", ".woff2", ".ttf", ".otf", ".eot",
		".mp4", ".webm":
		return "public, max-age=604800, stale-while-revalidate=86400"
	case ".js", ".css", ".map":
		return "public, max-age=86400, stale-while-revalidate=3600"
	default:
		return "public, max-age=3600"
	}
}

func ttlFor(requestPath string) int64 {
	if strings.HasPrefix(requestPath, "/_next/static/") {
		return 365 * 24 * 3600
	}
	ext := strings.ToLower(path.Ext(requestPath))
	switch ext {
	case ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico",
		".woff", ".woff2", ".ttf", ".otf", ".eot":
		return 7 * 24 * 3600
	default:
		return 3600
	}
}
