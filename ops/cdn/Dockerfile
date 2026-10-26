FROM golang:1.23-alpine

WORKDIR /app

RUN apk add --no-cache bash git ca-certificates

COPY go.mod ./
COPY *.go ./
ENV CGO_ENABLED=0
RUN go mod tidy \
	&& go test ./... \
	&& go build -trimpath -ldflags="-s -w" -o /usr/local/bin/cdn .

EXPOSE 8088

CMD ["cdn"]
