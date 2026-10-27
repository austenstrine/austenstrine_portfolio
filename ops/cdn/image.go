package main

import (
	"bytes"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/HugoSmits86/nativewebp"
	"github.com/disintegration/imaging"
	_ "golang.org/x/image/webp"
)

type transform struct {
	Width   int
	Height  int
	Fit     string
	Format  string
	Quality int
}

func parseTransform(query url.Values, maxDim int) (transform, bool, error) {
	tx := transform{
		Fit:     strings.ToLower(strings.TrimSpace(query.Get("fit"))),
		Format:  strings.ToLower(strings.TrimSpace(query.Get("fm"))),
		Quality: 82,
	}
	if tx.Fit == "" {
		tx.Fit = "contain"
	}
	if q := strings.TrimSpace(query.Get("q")); q != "" {
		n, err := strconv.Atoi(q)
		if err != nil || n < 1 || n > 100 {
			return transform{}, false, fmt.Errorf("q must be 1-100")
		}
		tx.Quality = n
	}
	var err error
	if w := strings.TrimSpace(query.Get("w")); w != "" {
		tx.Width, err = strconv.Atoi(w)
		if err != nil || tx.Width < 1 || tx.Width > maxDim {
			return transform{}, false, fmt.Errorf("w must be 1-%d", maxDim)
		}
	}
	if h := strings.TrimSpace(query.Get("h")); h != "" {
		tx.Height, err = strconv.Atoi(h)
		if err != nil || tx.Height < 1 || tx.Height > maxDim {
			return transform{}, false, fmt.Errorf("h must be 1-%d", maxDim)
		}
	}
	switch tx.Fit {
	case "contain", "cover", "inside":
	default:
		return transform{}, false, fmt.Errorf("fit must be contain, cover, or inside")
	}
	switch tx.Format {
	case "", "auto", "webp", "jpeg", "jpg", "png":
	default:
		return transform{}, false, fmt.Errorf("fm must be webp, jpeg, png, or auto")
	}
	active := tx.Width > 0 || tx.Height > 0 || (tx.Format != "" && tx.Format != "auto")
	return tx, active, nil
}

func applyTransform(src []byte, srcType string, tx transform, accept string, maxPixels int) ([]byte, string, error) {
	img, err := decodeImage(src)
	if err != nil {
		return nil, "", err
	}
	bounds := img.Bounds()
	if bounds.Dx()*bounds.Dy() > maxPixels {
		return nil, "", fmt.Errorf("image too large")
	}

	width := tx.Width
	height := tx.Height
	if width == 0 && height == 0 {
		width = bounds.Dx()
		height = bounds.Dy()
	}

	fit := imaging.Lanczos
	var out image.Image
	switch tx.Fit {
	case "cover":
		if width == 0 {
			width = height
		}
		if height == 0 {
			height = width
		}
		out = imaging.Fill(img, width, height, imaging.Center, fit)
	default:
		if width == 0 {
			width = bounds.Dx() * height / bounds.Dy()
			if width < 1 {
				width = 1
			}
		}
		if height == 0 {
			height = bounds.Dy() * width / bounds.Dx()
			if height < 1 {
				height = 1
			}
		}
		out = imaging.Fit(img, width, height, fit)
	}

	format := tx.Format
	if format == "" || format == "auto" {
		format = autoFormat(accept, srcType)
	}
	if format == "jpg" {
		format = "jpeg"
	}

	var buf bytes.Buffer
	contentType, err := encodeImage(&buf, out, format, tx.Quality)
	if err != nil {
		return nil, "", err
	}
	return buf.Bytes(), contentType, nil
}

func decodeImage(src []byte) (image.Image, error) {
	img, err := imaging.Decode(bytes.NewReader(src), imaging.AutoOrientation(true))
	if err == nil {
		return img, nil
	}
	decoded, _, fallbackErr := image.Decode(bytes.NewReader(src))
	if fallbackErr != nil {
		return nil, err
	}
	return decoded, nil
}

func encodeImage(w io.Writer, img image.Image, format string, quality int) (string, error) {
	switch format {
	case "png":
		return "image/png", png.Encode(w, img)
	case "gif":
		return "image/gif", gif.Encode(w, img, nil)
	case "webp":
		return "image/webp", nativewebp.Encode(w, img, nil)
	default:
		return "image/jpeg", jpeg.Encode(w, img, &jpeg.Options{Quality: quality})
	}
}

func autoFormat(accept, srcType string) string {
	if strings.Contains(accept, "image/webp") {
		return "webp"
	}
	if strings.Contains(srcType, "png") {
		return "png"
	}
	return "jpeg"
}

func wantsTransform(r *http.Request) bool {
	q := r.URL.Query()
	return q.Get("w") != "" || q.Get("h") != "" || q.Get("fm") != "" || q.Get("fit") != "" || q.Get("q") != ""
}
