package postgres

import (
	"context"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"photannie/internal/domain"
	"photannie/internal/repository"
)

type BookingRepository struct {
	pool *pgxpool.Pool
}

func NewBookingRepository(pool *pgxpool.Pool) *BookingRepository {
	return &BookingRepository{pool: pool}
}

var _ repository.BookingRepository = (*BookingRepository)(nil)

const qCreateBooking = `
INSERT INTO bookings (start_at, end_at, client_name, client_phone, comment)
VALUES ($1, $2, $3, $4, $5)
RETURNING
  id,
  start_at,
  end_at,
  client_name,
  client_phone,
  comment,
  status,
  created_at,
  cancelled_at,
  cancel_reason;
`

const qGetBookingByID = `
SELECT
  id,
  start_at,
  end_at,
  client_name,
  client_phone,
  comment,
  status,
  created_at,
  cancelled_at,
  cancel_reason
FROM bookings
WHERE id = $1;
`

const qListBookingsByRange = `
SELECT
  id,
  start_at,
  end_at,
  client_name,
  client_phone,
  comment,
  status,
  created_at,
  cancelled_at,
  cancel_reason
FROM bookings
WHERE tstzrange(start_at, end_at, '[)') && tstzrange($1, $2, '[)')
ORDER BY start_at ASC;
`

const qCancelBooking = `
UPDATE bookings
SET
  status = 'cancelled',
  cancelled_at = CASE WHEN status = 'active' THEN $2 ELSE cancelled_at END,
  cancel_reason = CASE WHEN status = 'active' THEN $3 ELSE cancel_reason END
WHERE id = $1
RETURNING
  id,
  start_at,
  end_at,
  client_name,
  client_phone,
  comment,
  status,
  created_at,
  cancelled_at,
  cancel_reason;
`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanBooking(s rowScanner) (domain.Booking, error) {
	var b domain.Booking
	var status string

	if err := s.Scan(
		&b.ID,
		&b.StartAt,
		&b.EndAt,
		&b.ClientName,
		&b.ClientPhone,
		&b.Comment,
		&status,
		&b.CreatedAt,
		&b.CancelledAt,
		&b.CancelReason,
	); err != nil {
		return domain.Booking{}, err
	}

	b.Status = domain.BookingStatus(status)
	return b, nil
}

func (r *BookingRepository) Create(ctx context.Context, p repository.CreateBookingParams) (domain.Booking, error) {
	if r.pool == nil {
		return domain.Booking{}, fmt.Errorf("postgres: booking repo: pool is nil")
	}

	row := r.pool.QueryRow(ctx, qCreateBooking,
		p.StartAt,
		p.EndAt,
		p.ClientName,
		p.ClientPhone,
		p.Comment,
	)

	b, err := scanBooking(row)
	if err != nil {
		return domain.Booking{}, mapPgError(err)
	}

	return b, nil
}

func (r *BookingRepository) GetByID(ctx context.Context, id uuid.UUID) (domain.Booking, error) {
	if r.pool == nil {
		return domain.Booking{}, fmt.Errorf("postgres: booking repo: pool is nil")
	}

	row := r.pool.QueryRow(ctx, qGetBookingByID, id)

	b, err := scanBooking(row)
	if err != nil {
		return domain.Booking{}, mapPgError(err)
	}

	return b, nil
}

func (r *BookingRepository) ListByRange(ctx context.Context, p repository.ListBookingsByRangeParams) ([]domain.Booking, error) {
	if r.pool == nil {
		return nil, fmt.Errorf("postgres: booking repo: pool is nil")
	}

	rows, err := r.pool.Query(ctx, qListBookingsByRange, p.RangeStart, p.RangeEnd)
	if err != nil {
		return nil, mapPgError(err)
	}
	defer rows.Close()

	out := make([]domain.Booking, 0, 32)
	for rows.Next() {
		b, err := scanBooking(rows)
		if err != nil {
			return nil, mapPgError(err)
		}
		out = append(out, b)
	}

	if err := rows.Err(); err != nil {
		return nil, mapPgError(err)
	}

	return out, nil
}

func (r *BookingRepository) Cancel(ctx context.Context, p repository.CancelBookingParams) (domain.Booking, error) {
	if r.pool == nil {
		return domain.Booking{}, fmt.Errorf("postgres: booking repo: pool is nil")
	}

	row := r.pool.QueryRow(ctx, qCancelBooking, p.ID, p.NowUTC, p.Reason)

	b, err := scanBooking(row)
	if err != nil {
		if errorsIsNoRows(err) {
			return domain.Booking{}, domain.ErrNotFound
		}
		return domain.Booking{}, mapPgError(err)
	}

	return b, nil
}

func errorsIsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
