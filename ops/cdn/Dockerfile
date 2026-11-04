# Thin PeM wrapper around github.com/austenstrine/golang-image-cdn.
# Prefer ./src from ensure-source.sh (live.sh / init-local.sh). When src/ is
# missing — e.g. `dssh cdn start` builds before cdn_start_local — shallow-clone
# during the image build so COPY does not fail on an empty context.
FROM golang:1.23-alpine AS build

WORKDIR /app

ARG CDN_SOURCE_REPO=https://github.com/austenstrine/golang-image-cdn.git
ARG CDN_SOURCE_REF=master

RUN apk add --no-cache \
	bash \
	build-base \
	ca-certificates \
	git \
	pkgconfig \
	vips-dev

COPY . /context/

RUN set -euo pipefail; \
	if [[ -f /context/src/go.mod ]]; then \
		echo "cdn build: using pre-cloned /context/src"; \
		cp -a /context/src/. /app/; \
	else \
		echo "cdn build: cloning ${CDN_SOURCE_REPO}@${CDN_SOURCE_REF}"; \
		git clone --depth 1 --branch "${CDN_SOURCE_REF}" "${CDN_SOURCE_REPO}" /tmp/cdn-src; \
		cp -a /tmp/cdn-src/. /app/; \
		rm -rf /tmp/cdn-src; \
	fi; \
	if [[ ! -f /app/go.mod ]]; then \
		echo "cdn build: go.mod missing after source populate" >&2; \
		exit 1; \
	fi; \
	if [[ ! -f /app/go.sum ]]; then \
		echo "cdn build: go.sum missing; running go mod tidy"; \
		go mod tidy; \
	fi

ENV CGO_ENABLED=1
RUN go mod download \
	&& go test ./... \
	&& go build -trimpath -ldflags="-s -w" -o /usr/local/bin/cdn .

FROM alpine:3.20

RUN apk add --no-cache \
	ca-certificates \
	curl \
	tini \
	vips \
	vips-heif \
	vips-magick \
	vips-poppler \
	vips-tools

COPY --from=build /usr/local/bin/cdn /usr/local/bin/cdn
# PeM catalog stock prewarm (not part of the generic CDN image).
COPY prewarm.sh /usr/local/bin/prewarm.sh
RUN chmod +x /usr/local/bin/prewarm.sh

EXPOSE 8088

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["cdn"]
