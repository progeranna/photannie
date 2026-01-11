package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

func Load() (Config, error) {
	cfg := Config{
		App: App{
			Env: getEnv("APP_ENV", "dev"),
			Log: Log{
				Level:  getEnv("LOG_LEVEL", "info"),
				Format: getEnv("LOG_FORMAT", "json"),
			},
		},
		HTTP: HTTP{
			Addr:            getEnv("HTTP_ADDR", ":8080"),
			BaseURL:         getEnv("HTTP_BASE_URL", ""),
			RequestTimeout:  getEnvDuration("HTTP_REQUEST_TIMEOUT", 15*time.Second),
			ReadTimeout:     getEnvDuration("HTTP_READ_TIMEOUT", 10*time.Second),
			WriteTimeout:    getEnvDuration("HTTP_WRITE_TIMEOUT", 10*time.Second),
			IdleTimeout:     getEnvDuration("HTTP_IDLE_TIMEOUT", 60*time.Second),
			ShutdownTimeout: getEnvDuration("HTTP_SHUTDOWN_TIMEOUT", 10*time.Second),
			CORS: CORS{
				AllowedOrigins: getEnvCSV("CORS_ALLOWED_ORIGINS", []string{
					"http://localhost:5173",
					"http://127.0.0.1:5173",
				}),
			},
			Admin: AdminAuth{
				Password:          mustEnv("ADMIN_PASSWORD"),
				SessionCookieName: getEnv("SESSION_COOKIE_NAME", "photannie_session"),
				SecureCookie:      getEnvBool("SECURE_COOKIE", false),
			},
		},
		Postgres: Postgres{
			ConnString: mustEnv("POSTGRES_DSN"),
			MaxConns:   int32(getEnvInt("POSTGRES_MAX_CONNS", 10)),
			MinConns:   int32(getEnvInt("POSTGRES_MIN_CONNS", 1)),
		},
		Rules: BookingRules{
			Timezone:          getEnv("STUDIO_TZ", "Europe/Moscow"),
			BookingWindowDays: getEnvInt("BOOKING_WINDOW_DAYS", 90),
			WorkStartHHMM:     getEnv("WORK_START", "09:00"),
			WorkEndHHMM:       getEnv("WORK_END", "18:00"),
			SlotMinutes:       getEnvInt("SLOT_MINUTES", 30),
			MaxSessionMinutes: getEnvInt("MAX_SESSION_MINUTES", 180),
		},
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func getEnv(key, def string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	return v
}

func mustEnv(key string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return ""
	}
	return v
}

func getEnvInt(key string, def int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return i
}

func getEnvBool(key string, def bool) bool {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	switch strings.ToLower(v) {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return def
	}
}

func getEnvDuration(key string, def time.Duration) time.Duration {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return def
	}
	return d
}

func getEnvCSV(key string, def []string) []string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		return def
	}
	return out
}

func (c Config) DebugString() string {
	return fmt.Sprintf(
		"env=%s http_addr=%s base_url=%s cors_origins=%v postgres_max_conns=%d studio_tz=%s window_days=%d",
		c.App.Env,
		c.HTTP.Addr,
		c.HTTP.BaseURL,
		c.HTTP.CORS.AllowedOrigins,
		c.Postgres.MaxConns,
		c.Rules.Timezone,
		c.Rules.BookingWindowDays,
	)
}
