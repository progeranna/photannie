package httpserver

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"photannie/internal/observability/metrics"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"photannie/internal/api"
	apphandler "photannie/internal/http/handler"
	appmw "photannie/internal/http/mw"
)

type SessionStore interface {
	Exists(sessionID string) bool
}

type Server struct {
	httpServer *http.Server
	log        *slog.Logger
	cfg        Config
}

type Config struct {
	Addr            string
	BaseURL         string
	RequestTimeout  time.Duration
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration

	AllowedOrigins []string

	SessionCookieName string
	SecureCookie      bool
}

func New(cfg Config, h *apphandler.Handler, sessions SessionStore, log *slog.Logger) *Server {
	if log == nil {
		log = slog.Default()
	}
	if cfg.SessionCookieName == "" {
		cfg.SessionCookieName = "photannie_session"
	}
	if len(cfg.AllowedOrigins) == 0 {
		cfg.AllowedOrigins = []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
		}
	}

	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	if cfg.RequestTimeout > 0 {
		r.Use(chimw.Timeout(cfg.RequestTimeout))
	}

	r.Use(appmw.AccessLog(log))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Idempotency-Key"},
		ExposedHeaders:   []string{"X-Request-Id"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(appmw.AdminSessionGuard(appmw.AdminSessionGuardConfig{
		CookieName: cfg.SessionCookieName,
		Store:      sessions,
		Logger:     log,
	}))
	m := metrics.New("photannie")

	r.Use(m.Middleware)

	r.Handle("/metrics", m.Handler())

	api.HandlerWithOptions(h, api.ChiServerOptions{
		BaseURL:          cfg.BaseURL,
		BaseRouter:       r,
		ErrorHandlerFunc: apphandler.OapiBindingErrorHandler(log),
	})

	srv := &http.Server{
		Addr:         cfg.Addr,
		Handler:      r,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	return &Server{
		httpServer: srv,
		log:        log,
		cfg:        cfg,
	}
}

func (s *Server) ListenAndServe(ctx context.Context) error {
	errCh := make(chan error, 1)

	go func() {
		s.log.Info("http server starting", "addr", s.cfg.Addr)
		if err := s.httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	select {
	case <-ctx.Done():
		s.log.Info("shutdown requested by context")
	case <-stop:
		s.log.Info("shutdown requested by signal")
	case err := <-errCh:
		return err
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), s.cfg.ShutdownTimeout)
	defer cancel()

	if err := s.httpServer.Shutdown(shutdownCtx); err != nil {
		return err
	}
	return <-errCh
}

func (s *Server) Close() error {
	return s.httpServer.Close()
}
