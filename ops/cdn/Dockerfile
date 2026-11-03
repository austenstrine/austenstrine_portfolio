# Thin PeM wrapper around github.com/austenstrine/golang-image-cdn.
# Populate ./src first: ./ops/cdn/ensure-source.sh (live.sh / init-local.sh).
FROM golang:1.23-alpine AS build

WORKDIR /app

RUN apk add --no-cache \
	bash \
	build-base \
	ca-certificates \
	pkgconfig \
	vips-dev

COPY src/go.mod src/go.sum ./
COPY src/*.go ./

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
