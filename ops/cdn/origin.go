package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type originObject struct {
	Body        []byte
	ContentType string
}

type originStore struct {
	dir        string
	pullOrigin string
	client     *http.Client
	maxBytes   int64
}

func newOriginStore(dir, pullOrigin string, timeout time.Duration, maxBytes int64) (*originStore, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &originStore{
		dir:        dir,
		pullOrigin: strings.TrimRight(pullOrigin, "/"),
		client:     &http.Client{Timeout: timeout},
		maxBytes:   maxBytes,
	}, nil
}

func (o *originStore) get(requestPath string) (originObject, bool, error) {
	if object, ok, err := o.readLocal(requestPath); err != nil || ok {
		return object, ok, err
	}
	if !isPullable(requestPath) {
		return originObject{}, false, nil
	}
	return o.pull(requestPath)
}

func (o *originStore) readLocal(requestPath string) (originObject, bool, error) {
	full, ok := jailJoin(o.dir, requestPath)
	if !ok {
		return originObject{}, false, nil
	}
	info, err := os.Stat(full)
	if err != nil {
		if os.IsNotExist(err) {
			return originObject{}, false, nil
		}
		return originObject{}, false, err
	}
	if info.IsDir() {
		return originObject{}, false, nil
	}
	if info.Size() > o.maxBytes {
		return originObject{}, false, fmt.Errorf("origin object too large")
	}
	body, err := os.ReadFile(full)
	if err != nil {
		return originObject{}, false, err
	}
	return originObject{Body: body, ContentType: typeFor(requestPath, body)}, true, nil
}

func (o *originStore) put(requestPath string, body []byte) error {
	full, ok := jailJoin(o.dir, requestPath)
	if !ok {
		return os.ErrInvalid
	}
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}
	tmp := full + ".tmp"
	if err := os.WriteFile(tmp, body, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, full)
}

func (o *originStore) delete(requestPath string) error {
	full, ok := jailJoin(o.dir, requestPath)
	if !ok {
		return os.ErrInvalid
	}
	err := os.Remove(full)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

func (o *originStore) pull(requestPath string) (originObject, bool, error) {
	url := o.pullOrigin + requestPath
	response, err := o.client.Get(url)
	if err != nil {
		return originObject{}, false, err
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusNotFound {
		return originObject{}, false, nil
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return originObject{}, false, fmt.Errorf("origin %s", response.Status)
	}
	limited := io.LimitReader(response.Body, o.maxBytes+1)
	body, err := io.ReadAll(limited)
	if err != nil {
		return originObject{}, false, err
	}
	if int64(len(body)) > o.maxBytes {
		return originObject{}, false, fmt.Errorf("origin object too large")
	}
	contentType := response.Header.Get("Content-Type")
	if contentType == "" {
		contentType = typeFor(requestPath, body)
	}
	if strings.Contains(strings.ToLower(contentType), "text/html") {
		return originObject{}, false, nil
	}
	return originObject{Body: body, ContentType: contentType}, true, nil
}

func typeFor(requestPath string, body []byte) string {
	ext := strings.ToLower(filepath.Ext(requestPath))
	switch ext {
	case ".js":
		return "text/javascript; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".json":
		return "application/json"
	case ".svg":
		return "image/svg+xml"
	case ".woff":
		return "font/woff"
	case ".woff2":
		return "font/woff2"
	case ".ttf":
		return "font/ttf"
	case ".webp":
		return "image/webp"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".ico":
		return "image/x-icon"
	case ".pdf":
		return "application/pdf"
	case ".mp4":
		return "video/mp4"
	}
	return http.DetectContentType(body)
}
