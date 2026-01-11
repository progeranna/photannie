package app

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"log/slog"
	"time"

	"photannie/internal/config"
	"photannie/internal/http"
	"photannie/internal/http/handler"
	"photannie/internal/http/session"
	"photannie/internal/repository/postgres"
	"photannie/internal/service/booking"
)

type App struct {
	log    *slog.Logger
	pool   *pgxpool.Pool
	server *httpserver.Server

	closePool func()
	closeHTTP func() error
}

func New(ctx context.Context, cfg config.Config, log *slog.Logger) (*App, error) {
	if log == nil {
		log = slog.Default()
	}
	log = log.With("component", "app")

	loc, err := time.LoadLocation(cfg.Rules.Timezone)
	if err != nil {
		return nil, fmt.Errorf("load studio timezone %q: %w", cfg.Rules.Timezone, err)
	}

	pool, err := postgres.NewPool(ctx, postgres.PoolConfig{
		ConnString: cfg.Postgres.ConnString,
		MaxConns:   cfg.Postgres.MaxConns,
		MinConns:   cfg.Postgres.MinConns,
	})
	if err != nil {
		return nil, fmt.Errorf("postgres pool: %w", err)
	}

	repo := postgres.NewBookingRepository(pool)

	svc, err := booking.New(repo, booking.Rules{
		Location:          loc,
		BookingWindowDays: cfg.Rules.BookingWindowDays,
		WorkStartHHMM:     cfg.Rules.WorkStartHHMM,
		WorkEndHHMM:       cfg.Rules.WorkEndHHMM,
		SlotMinutes:       cfg.Rules.SlotMinutes,
		MaxSessionMinutes: cfg.Rules.MaxSessionMinutes,
	}, log)
	if err != nil {
		pool.Close()
		return nil, fmt.Errorf("booking service: %w", err)
	}

	sessions := session.NewMemoryStore()

	h := handler.New(handler.Deps{
		Booking:       svc,
		AdminPassword: cfg.HTTP.Admin.Password,
		CookieName:    cfg.HTTP.Admin.SessionCookieName,
		SecureCookie:  cfg.HTTP.Admin.SecureCookie,
		Sessions:      sessions,
		Logger:        log,
	})

	srv := httpserver.New(httpserver.Config{
		Addr:            cfg.HTTP.Addr,
		BaseURL:         cfg.HTTP.BaseURL,
		RequestTimeout:  cfg.HTTP.RequestTimeout,
		ReadTimeout:     cfg.HTTP.ReadTimeout,
		WriteTimeout:    cfg.HTTP.WriteTimeout,
		IdleTimeout:     cfg.HTTP.IdleTimeout,
		ShutdownTimeout: cfg.HTTP.ShutdownTimeout,

		AllowedOrigins:    cfg.HTTP.CORS.AllowedOrigins,
		SessionCookieName: cfg.HTTP.Admin.SessionCookieName,
		SecureCookie:      cfg.HTTP.Admin.SecureCookie,
	}, h, sessions, log)

	return &App{
		log:       log,
		pool:      pool,
		server:    srv,
		closePool: pool.Close,
		closeHTTP: srv.Close,
	}, nil
}

func (a *App) Run(ctx context.Context) error {
	return a.server.ListenAndServe(ctx)
}

func (a *App) Close() {
	if a == nil {
		return
	}

	if a.closeHTTP != nil {
		_ = a.closeHTTP()
	}
	if a.closePool != nil {
		a.closePool()
	}
}
