FROM golang:1.24-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -o /out/photannie ./cmd/photannie


FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=build /out/photannie /app/photannie
COPY migrations /app/migrations

EXPOSE 8080
ENTRYPOINT ["/app/photannie"]
