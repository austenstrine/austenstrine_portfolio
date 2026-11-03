package main

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"testing"

	"github.com/davidbyttow/govips/v2/vips"
)

func TestApplyTransformCoverWebp(t *testing.T) {
	vips.Startup(nil)
	t.Cleanup(vips.Shutdown)

	src := sampleJPEG(t, 640, 480)
	out, contentType, err := applyTransform(
		src,
		"image/jpeg",
		transform{Width: 200, Height: 200, Fit: "cover", Format: "webp", Quality: 72},
		"image/webp",
		40_000_000,
	)
	if err != nil {
		t.Fatalf("applyTransform: %v", err)
	}
	if contentType != "image/webp" {
		t.Fatalf("content-type = %q", contentType)
	}
	if len(out) < 64 {
		t.Fatalf("webp too small: %d bytes", len(out))
	}

	img, err := vips.NewImageFromBuffer(out)
	if err != nil {
		t.Fatalf("decode webp: %v", err)
	}
	defer img.Close()
	if img.Width() != 200 || img.Height() != 200 {
		t.Fatalf("got %dx%d want 200x200", img.Width(), img.Height())
	}
}

func BenchmarkApplyTransformCoverWebp(b *testing.B) {
	vips.Startup(nil)
	b.Cleanup(vips.Shutdown)

	src := sampleJPEG(b, 1200, 900)
	tx := transform{Width: 200, Height: 200, Fit: "cover", Format: "webp", Quality: 72}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, _, err := applyTransform(src, "image/jpeg", tx, "image/webp", 40_000_000); err != nil {
			b.Fatal(err)
		}
	}
}

func sampleJPEG(t testing.TB, width, height int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.RGBA{
				R: uint8((x * 3) % 255),
				G: uint8((y * 5) % 255),
				B: uint8((x + y) % 255),
				A: 255,
			})
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85}); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}
