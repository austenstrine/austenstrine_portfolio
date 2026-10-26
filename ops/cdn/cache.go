package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type cacheMeta struct {
	Path        string `json:"path"`
	Variant     string `json:"variant"`
	ContentType string `json:"contentType"`
	ETag        string `json:"etag"`
	StoredAt    int64  `json:"storedAt"`
	TTLSeconds  int64  `json:"ttlSeconds"`
	Bytes       int64  `json:"bytes"`
}

type cacheStore struct {
	root string
}

func newCacheStore(root string) (*cacheStore, error) {
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	return &cacheStore{root: root}, nil
}

func (c *cacheStore) objectDir(requestPath, variant string) (string, bool) {
	cleaned, ok := cleanRequestPath(requestPath)
	if !ok || cleaned == "/" {
		return "", false
	}
	sum := sha256.Sum256([]byte(cleaned + "\n" + variant))
	return filepath.Join(c.root, hex.EncodeToString(sum[:])), true
}

func (c *cacheStore) get(requestPath, variant string) (body []byte, meta cacheMeta, hit string, ok bool) {
	dir, allowed := c.objectDir(requestPath, variant)
	if !allowed {
		return nil, cacheMeta{}, "", false
	}
	raw, err := os.ReadFile(filepath.Join(dir, "meta.json"))
	if err != nil {
		return nil, cacheMeta{}, "", false
	}
	if err := json.Unmarshal(raw, &meta); err != nil {
		return nil, cacheMeta{}, "", false
	}
	body, err = os.ReadFile(filepath.Join(dir, "body"))
	if err != nil {
		return nil, cacheMeta{}, "", false
	}
	age := time.Now().Unix() - meta.StoredAt
	if meta.TTLSeconds > 0 && age > meta.TTLSeconds {
		return body, meta, "stale", true
	}
	return body, meta, "hit", true
}

func (c *cacheStore) put(requestPath, variant string, contentType string, ttl int64, body []byte) (cacheMeta, error) {
	dir, allowed := c.objectDir(requestPath, variant)
	if !allowed {
		return cacheMeta{}, os.ErrInvalid
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return cacheMeta{}, err
	}
	sum := sha256.Sum256(body)
	meta := cacheMeta{
		Path:        requestPath,
		Variant:     variant,
		ContentType: contentType,
		ETag:        `"` + hex.EncodeToString(sum[:16]) + `"`,
		StoredAt:    time.Now().Unix(),
		TTLSeconds:  ttl,
		Bytes:       int64(len(body)),
	}
	tmp := dir + ".tmp"
	if err := os.MkdirAll(tmp, 0o755); err != nil {
		return cacheMeta{}, err
	}
	if err := os.WriteFile(filepath.Join(tmp, "body"), body, 0o644); err != nil {
		os.RemoveAll(tmp)
		return cacheMeta{}, err
	}
	encoded, err := json.MarshalIndent(meta, "", "\t")
	if err != nil {
		os.RemoveAll(tmp)
		return cacheMeta{}, err
	}
	if err := os.WriteFile(filepath.Join(tmp, "meta.json"), encoded, 0o644); err != nil {
		os.RemoveAll(tmp)
		return cacheMeta{}, err
	}
	os.RemoveAll(dir)
	if err := os.Rename(tmp, dir); err != nil {
		os.RemoveAll(tmp)
		return cacheMeta{}, err
	}
	return meta, nil
}

func (c *cacheStore) purge(requestPath, prefix string) (int, error) {
	entries, err := os.ReadDir(c.root)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}
	removed := 0
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(c.root, entry.Name(), "meta.json"))
		if err != nil {
			continue
		}
		var meta cacheMeta
		if json.Unmarshal(raw, &meta) != nil {
			continue
		}
		match := false
		if requestPath != "" && meta.Path == requestPath {
			match = true
		}
		if prefix != "" && strings.HasPrefix(meta.Path, prefix) {
			match = true
		}
		if !match {
			continue
		}
		if err := os.RemoveAll(filepath.Join(c.root, entry.Name())); err != nil {
			return removed, err
		}
		removed++
	}
	return removed, nil
}

func (c *cacheStore) stats() (objects int, bytes int64) {
	entries, err := os.ReadDir(c.root)
	if err != nil {
		return 0, 0
	}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		info, err := os.Stat(filepath.Join(c.root, entry.Name(), "body"))
		if err != nil {
			continue
		}
		objects++
		bytes += info.Size()
	}
	return objects, bytes
}
