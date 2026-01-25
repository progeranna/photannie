package config

import (
	"fmt"
	"time"
)

type Config struct {
	App      App
	HTTP     HTTP
	Postgres Postgres
	Rules    BookingRules
}

type App struct {
	Env string
	Log Log
}

type Log struct {
	Level  string
	Format string
}

type HTTP struct {
	Addr            string
	BaseURL         string
	RequestTimeout  time.Duration
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration

	CORS CORS

	Admin AdminAuth
}

type CORS struct {
	AllowedOrigins []string
}

type AdminAuth struct {
	Password          string
	SessionCookieName string
	SecureCookie      bool
}

type Postgres struct {
	ConnString string

	MaxConns int32
	MinConns int32
}

type BookingRules struct {
	Timezone          string // "Europe/Moscow"
	BookingWindowDays int    // 90
	WorkStartHHMM     string // "09:00"
	WorkEndHHMM       string // "18:00"
	SlotMinutes       int    // 30
	MaxSessionMinutes int    // напр. 180
}

func (c Config) Validate() error {
	if c.App.Env == "" {
		return fmt.Errorf("APP_ENV is required (dev/prod)")
	}
	if c.App.Log.Level == "" {
		return fmt.Errorf("LOG_LEVEL is required (debug/info/warn/error)")
	}
	if c.App.Log.Format == "" {
		return fmt.Errorf("LOG_FORMAT is required (json/text)")
	}

	if c.HTTP.Addr == "" {
		return fmt.Errorf("HTTP_ADDR is required (e.g. :8080)")
	}
	if c.HTTP.ShutdownTimeout <= 0 {
		return fmt.Errorf("HTTP_SHUTDOWN_TIMEOUT must be > 0")
	}
	if c.HTTP.RequestTimeout <= 0 {
		return fmt.Errorf("HTTP_REQUEST_TIMEOUT must be > 0")
	}
	if c.HTTP.ReadTimeout <= 0 || c.HTTP.WriteTimeout <= 0 || c.HTTP.IdleTimeout <= 0 {
		return fmt.Errorf("HTTP_*_TIMEOUT must be > 0")
	}

	if c.HTTP.Admin.Password == "" {
		return fmt.Errorf("ADMIN_PASSWORD is required")
	}
	if c.HTTP.Admin.SessionCookieName == "" {
		return fmt.Errorf("SESSION_COOKIE_NAME is required")
	}

	if c.Postgres.ConnString == "" {
		return fmt.Errorf("POSTGRES_DSN is required")
	}

	if c.Rules.Timezone == "" {
		return fmt.Errorf("STUDIO_TZ is required (Europe/Moscow)")
	}
	if c.Rules.BookingWindowDays <= 0 {
		return fmt.Errorf("BOOKING_WINDOW_DAYS must be > 0")
	}
	if c.Rules.WorkStartHHMM == "" || c.Rules.WorkEndHHMM == "" {
		return fmt.Errorf("WORK_START / WORK_END required (HH:MM)")
	}
	if c.Rules.SlotMinutes <= 0 {
		return fmt.Errorf("SLOT_MINUTES must be > 0")
	}
	if c.Rules.MaxSessionMinutes <= 0 {
		return fmt.Errorf("MAX_SESSION_MINUTES must be > 0")
	}
	if c.Rules.MaxSessionMinutes%c.Rules.SlotMinutes != 0 {
		return fmt.Errorf("MAX_SESSION_MINUTES must be multiple of SLOT_MINUTES")
	}

	return nil
}
