package postgres

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"photannie/internal/domain"
)

const (
	sqlStateExclusionViolation = "23P01"
)

func mapPgError(err error) error {
	if err == nil {
		return nil
	}

	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case sqlStateExclusionViolation:
			return domain.ErrConflict
		}
	}

	return fmt.Errorf("postgres: %w", err)
}
