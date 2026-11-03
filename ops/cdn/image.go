package main

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/davidbyttow/govips/v2/vips"
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
	img, err := vips.NewImageFromBuffer(src)
	if err != nil {
		return nil, "", err
	}
	defer img.Close()

	if err := img.AutoRotate(); err != nil {
		return nil, "", err
	}

	width := img.Width()
	height := img.Height()
	if width*height > maxPixels {
		return nil, "", fmt.Errorf("image too large")
	}

	targetW := tx.Width
	targetH := tx.Height
	if targetW == 0 && targetH == 0 {
		targetW = width
		targetH = height
	}

	switch tx.Fit {
	case "cover":
		if targetW == 0 {
			targetW = targetH
		}
		if targetH == 0 {
			targetH = targetW
		}
		if err := img.Thumbnail(targetW, targetH, vips.InterestingCentre); err != nil {
			return nil, "", err
		}
	default:
		if targetW == 0 {
			targetW = width * targetH / height
			if targetW < 1 {
				targetW = 1
			}
		}
		if targetH == 0 {
			targetH = height * targetW / width
			if targetH < 1 {
				targetH = 1
			}
		}
		if err := img.Thumbnail(targetW, targetH, vips.InterestingNone); err != nil {
			return nil, "", err
		}
	}

	format := tx.Format
	if format == "" || format == "auto" {
		format = autoFormat(accept, srcType)
	}
	if format == "jpg" {
		format = "jpeg"
	}

	return encodeVips(img, format, tx.Quality)
}

func encodeVips(img *vips.ImageRef, format string, quality int) ([]byte, string, error) {
	switch format {
	case "png":
		params := vips.NewPngExportParams()
		buf, _, err := img.ExportPng(params)
		return buf, "image/png", err
	case "webp":
		params := vips.NewWebpExportParams()
		params.Quality = quality
		buf, _, err := img.ExportWebp(params)
		return buf, "image/webp", err
	default:
		params := vips.NewJpegExportParams()
		params.Quality = quality
		buf, _, err := img.ExportJpeg(params)
		return buf, "image/jpeg", err
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
