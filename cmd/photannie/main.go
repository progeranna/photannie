package main

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"photannie/internal/app"
	"photannie/internal/config"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		_, _ = os.Stderr.WriteString("config error: " + err.Error() + "\n")
		os.Exit(1)
	}

	log := newLogger(cfg)
	slog.SetDefault(log)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := runMigrations(ctx, log, cfg.Postgres.ConnString); err != nil {
		log.Error("migrations failed", "err", err)
		os.Exit(1)
	}

	a, err := app.New(ctx, cfg, log)
	if err != nil {
		log.Error("app init failed", "err", err)
		os.Exit(1)
	}
	defer a.Close()

	if err := a.Run(ctx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Error("server stopped with error", "err", err)
		os.Exit(1)
	}

	log.Info("shutdown complete")
}

func runMigrations(ctx context.Context, log *slog.Logger, dsn string) error {
	dir := os.Getenv("GOOSE_MIGRATIONS_DIR")
	if dir == "" {
		dir = "migrations"
	}

	migCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return err
	}
	defer func() { _ = db.Close() }()

	db.SetMaxOpenConns(2)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(5 * time.Minute)

	for {
		if err := db.PingContext(migCtx); err == nil {
			break
		}
		select {
		case <-migCtx.Done():
			return errors.New("db is not ready: ping timeout")
		case <-time.After(300 * time.Millisecond):
		}
	}

	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}

	log.Info("running migrations", "dir", dir)
	if err := goose.UpContext(migCtx, db, dir); err != nil {
		return err
	}
	log.Info("migrations applied")

	return nil
}

func newLogger(cfg config.Config) *slog.Logger {
	var level slog.Level
	switch cfg.App.Log.Level {
	case "debug":
		level = slog.LevelDebug
	case "info":
		level = slog.LevelInfo
	case "warn", "warning":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{Level: level}

	var h slog.Handler
	switch cfg.App.Log.Format {
	case "text":
		h = slog.NewTextHandler(os.Stdout, opts)
	case "json":
		fallthrough
	default:
		h = slog.NewJSONHandler(os.Stdout, opts)
	}

	return slog.New(h)
}
