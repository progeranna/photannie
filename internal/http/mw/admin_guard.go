package mw

import (
	"log/slog"
	"net/http"
	"strings"
)

type SessionStore interface {
	Exists(sessionID string) bool
}

type AdminSessionGuardConfig struct {
	CookieName string
	Store      SessionStore
	Logger     *slog.Logger
}

func AdminSessionGuard(cfg AdminSessionGuardConfig) func(http.Handler) http.Handler {
	if cfg.Logger == nil {
		cfg.Logger = slog.Default()
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path
			if !strings.HasPrefix(path, "/api/admin/") {
				next.ServeHTTP(w, r)
				return
			}
			if path == "/api/admin/session/login" {
				next.ServeHTTP(w, r)
				return
			}

			c, err := r.Cookie(cfg.CookieName)
			if err != nil || c == nil || c.Value == "" || cfg.Store == nil || !cfg.Store.Exists(c.Value) {
				cfg.Logger.Info("admin unauthorized",
					"path", r.URL.Path,
					"method", r.Method,
				)
				writeUnauthorized(w)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"code":"admin_unauthorized","message":"Требуется вход администратора"}`))
}
