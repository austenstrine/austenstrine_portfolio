package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync/atomic"
	"time"
)

type server struct {
	cfg    config
	cache  *cacheStore
	origin *originStore
	log    *slog.Logger
	hits   atomic.Uint64
	misses atomic.Uint64
	stale  atomic.Uint64
}

func newServer(cfg config, log *slog.Logger) (*server, error) {
	cache, err := newCacheStore(cfg.CacheDir)
	if err != nil {
		return nil, err
	}
	origin, err := newOriginStore(cfg.OriginDir, cfg.PullOrigin, cfg.PullTimeout, cfg.MaxUpload)
	if err != nil {
		return nil, err
	}
	return &server{cfg: cfg, cache: cache, origin: origin, log: log}, nil
}

func (s *server) routes() http.Handler {
	return s.withAccess(http.HandlerFunc(s.dispatch))
}

func (s *server) dispatch(w http.ResponseWriter, r *http.Request) {
	requestPath, ok := cleanRequestPath(r.URL.Path)
	if !ok {
		http.Error(w, "bad path", http.StatusBadRequest)
		return
	}

	switch {
	case requestPath == "/healthz" && (r.Method == http.MethodGet || r.Method == http.MethodHead):
		s.handleHealth(w, r)
	case requestPath == "/" && (r.Method == http.MethodGet || r.Method == http.MethodHead):
		s.handleHelp(w, r)
	case r.Method == http.MethodPost && requestPath == "/purge":
		s.handlePurge(w, r)
	case r.Method == "PURGE":
		s.purgeOne(w, r, requestPath)
	case r.Method == http.MethodPut && strings.HasPrefix(requestPath, "/media/"):
		s.handleUpload(w, r, requestPath)
	case r.Method == http.MethodDelete && strings.HasPrefix(requestPath, "/media/"):
		s.handleDelete(w, r, requestPath)
	case r.Method == http.MethodGet || r.Method == http.MethodHead:
		s.handleObject(w, r, requestPath)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *server) withAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &statusWriter{ResponseWriter: w, status: 200}
		next.ServeHTTP(wrapped, r)
		s.log.Info("cdn",
			"status", wrapped.status,
			"method", r.Method,
			"path", r.URL.RequestURI(),
			"cache", wrapped.Header().Get("X-Cache"),
			"ms", time.Since(start).Milliseconds(),
		)
	})
}

func (s *server) handleHelp(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	fmt.Fprintf(w, `austenstrine cdn

GET     /healthz
GET     /<path>                    cache, local origin, or pull
GET     /<path>?w=&h=&fit=&fm=&q=  resize / convert
PUT     /media/<key>               upload origin object (Bearer)
DELETE  /media/<key>               delete origin object (Bearer)
POST    /purge                     {"path":"..."} or {"prefix":"..."} (Bearer)
PURGE   /<path>                    purge one path (Bearer)

fit  contain | cover | inside
fm   auto | webp | jpeg | png
q    1-100

public  %s
pull    %s
`, s.cfg.PublicURL, s.cfg.PullOrigin)
}

func (s *server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	objects, bytes := s.cache.stats()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":        true,
		"publicUrl": s.cfg.PublicURL,
		"pull":      s.cfg.PullOrigin,
		"cache": map[string]any{
			"objects": objects,
			"bytes":   bytes,
			"hits":    s.hits.Load(),
			"misses":  s.misses.Load(),
			"stale":   s.stale.Load(),
		},
	})
}

func (s *server) handleObject(w http.ResponseWriter, r *http.Request, requestPath string) {
	query := r.URL.Query()
	tx, active, err := parseTransform(query, s.cfg.MaxDim)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if wantsTransform(r) && !active && err == nil {
		active = true
	}
	variant := "default"
	if active {
		variant = variantKey(query)
		if tx.Format == "auto" || tx.Format == "" {
			variant += "&accept=" + acceptKind(r.Header.Get("Accept"))
		}
	}

	if body, meta, state, found := s.cache.get(requestPath, variant); found {
		if state == "hit" {
			s.hits.Add(1)
			s.writeObject(w, r, body, meta, "HIT")
			return
		}
		fresh, freshMeta, pulled, pullErr := s.load(requestPath, variant, active, tx, r.Header.Get("Accept"))
		if pullErr == nil && pulled {
			s.stale.Add(1)
			s.writeObject(w, r, fresh, freshMeta, "REVALIDATED")
			return
		}
		s.stale.Add(1)
		s.writeObject(w, r, body, meta, "STALE")
		return
	}

	body, meta, found, err := s.load(requestPath, variant, active, tx, r.Header.Get("Accept"))
	if err != nil {
		s.log.Error("origin", "path", requestPath, "err", err)
		http.Error(w, "origin unavailable", http.StatusBadGateway)
		return
	}
	if !found {
		http.NotFound(w, r)
		return
	}
	s.misses.Add(1)
	s.writeObject(w, r, body, meta, "MISS")
}

func (s *server) load(requestPath, variant string, active bool, tx transform, accept string) ([]byte, cacheMeta, bool, error) {
	object, found, err := s.origin.get(requestPath)
	if err != nil || !found {
		return nil, cacheMeta{}, found, err
	}
	body := object.Body
	contentType := object.ContentType
	if active && isRaster(contentType, requestPath) {
		converted, convertedType, convErr := applyTransform(body, contentType, tx, accept, s.cfg.MaxPixels)
		if convErr != nil {
			return nil, cacheMeta{}, false, convErr
		}
		body = converted
		contentType = convertedType
	}
	meta, err := s.cache.put(requestPath, variant, contentType, ttlFor(requestPath), body)
	if err != nil {
		return body, cacheMeta{
			Path:        requestPath,
			ContentType: contentType,
			ETag:        "",
			Bytes:       int64(len(body)),
		}, true, nil
	}
	return body, meta, true, nil
}

func (s *server) writeObject(w http.ResponseWriter, r *http.Request, body []byte, meta cacheMeta, cacheState string) {
	if inm := r.Header.Get("If-None-Match"); inm != "" && meta.ETag != "" && inm == meta.ETag {
		w.Header().Set("ETag", meta.ETag)
		w.Header().Set("X-Cache", cacheState)
		w.WriteHeader(http.StatusNotModified)
		return
	}
	w.Header().Set("Content-Type", meta.ContentType)
	w.Header().Set("Cache-Control", cacheControlFor(meta.Path))
	w.Header().Set("X-Cache", cacheState)
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Timing-Allow-Origin", "*")
	if meta.ETag != "" {
		w.Header().Set("ETag", meta.ETag)
	}
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(body)))
	if r.Method == http.MethodHead {
		return
	}
	_, _ = w.Write(body)
}

func (s *server) handleUpload(w http.ResponseWriter, r *http.Request, requestPath string) {
	if !s.authorized(w, r) {
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, s.cfg.MaxUpload+1))
	if err != nil {
		http.Error(w, "read failed", http.StatusBadRequest)
		return
	}
	if int64(len(body)) > s.cfg.MaxUpload {
		http.Error(w, "object too large", http.StatusRequestEntityTooLarge)
		return
	}
	if err := s.origin.put(requestPath, body); err != nil {
		http.Error(w, "could not store", http.StatusInternalServerError)
		return
	}
	_, _ = s.cache.purge(requestPath, "")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"path": requestPath,
		"url":  s.cfg.PublicURL + requestPath,
	})
}

func (s *server) handleDelete(w http.ResponseWriter, r *http.Request, requestPath string) {
	if !s.authorized(w, r) {
		return
	}
	if err := s.origin.delete(requestPath); err != nil {
		http.Error(w, "could not delete", http.StatusInternalServerError)
		return
	}
	removed, _ := s.cache.purge(requestPath, "")
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"path": requestPath, "purged": removed})
}

type purgeBody struct {
	Path   string `json:"path"`
	Prefix string `json:"prefix"`
}

func (s *server) handlePurge(w http.ResponseWriter, r *http.Request) {
	if !s.authorized(w, r) {
		return
	}
	var body purgeBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "json body required", http.StatusBadRequest)
		return
	}
	if body.Path == "" && body.Prefix == "" {
		http.Error(w, "path or prefix required", http.StatusBadRequest)
		return
	}
	removed, err := s.cache.purge(body.Path, body.Prefix)
	if err != nil {
		http.Error(w, "purge failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"purged": removed})
}

func (s *server) purgeOne(w http.ResponseWriter, r *http.Request, requestPath string) {
	if !s.authorized(w, r) {
		return
	}
	removed, err := s.cache.purge(requestPath, "")
	if err != nil {
		http.Error(w, "purge failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"path": requestPath, "purged": removed})
}

func (s *server) authorized(w http.ResponseWriter, r *http.Request) bool {
	if s.cfg.Token == "" {
		http.Error(w, "uploads and purge are disabled until CDN_TOKEN is set", http.StatusForbidden)
		return false
	}
	got := strings.TrimSpace(r.Header.Get("X-CDN-Token"))
	if got == "" {
		got = strings.TrimSpace(r.Header.Get("Authorization"))
		got = strings.TrimSpace(strings.TrimPrefix(got, "Bearer"))
	}
	if got != s.cfg.Token {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return false
	}
	return true
}

func acceptKind(accept string) string {
	if strings.Contains(accept, "image/webp") {
		return "webp"
	}
	return "other"
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func ensureDirs(paths ...string) error {
	for _, path := range paths {
		if err := os.MkdirAll(path, 0o755); err != nil {
			return err
		}
	}
	return nil
}
