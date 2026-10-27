package main

import "testing"

func TestCleanRequestPath(t *testing.T) {
	ok := func(in, want string) {
		t.Helper()
		got, pass := cleanRequestPath(in)
		if !pass || got != want {
			t.Fatalf("cleanRequestPath(%q) = %q, %v; want %q, true", in, got, pass, want)
		}
	}

	ok("/", "/")
	ok("/recommendations/a.png", "/recommendations/a.png")
	ok("/foo/../bar.png", "/bar.png")
	ok("/foo/bar/..", "/foo")
	ok("/foo/%2e%2e/%2e%2e/etc/passwd", "/etc/passwd")
}

func TestJailJoinStaysInRoot(t *testing.T) {
	full, ok := jailJoin("/tmp/cdn-origin", "/foo/%2e%2e/%2e%2e/etc/passwd")
	if !ok {
		t.Fatal("expected a jailed path")
	}
	if full != "/tmp/cdn-origin/etc/passwd" {
		t.Fatalf("got %q", full)
	}
	if _, ok := jailJoin("/tmp/cdn-origin", "/"); ok {
		t.Fatal("root path is not a file")
	}
}

func TestIsPullable(t *testing.T) {
	if !isPullable("/_next/static/chunks/app.js") {
		t.Fatal("expected hashed next assets to pull")
	}
	if !isPullable("/pp1_sq_sm.jpg") {
		t.Fatal("expected images to pull")
	}
	if isPullable("/place-et-marque") {
		t.Fatal("html routes must not pull through the cdn")
	}
	if isPullable("/api/health") {
		t.Fatal("api routes must not pull through the cdn")
	}
}
