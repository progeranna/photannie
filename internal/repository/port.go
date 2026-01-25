package repository

import (
	"context"
	"time"

	"github.com/google/uuid"

	"photannie/internal/domain"
)

type CreateBookingParams struct {
	StartAt time.Time
	EndAt   time.Time

	ClientName  string
	ClientPhone string
	Comment     *string
}

type ListBookingsByRangeParams struct {
	RangeStart time.Time
	RangeEnd   time.Time
}

type CancelBookingParams struct {
	ID     uuid.UUID
	NowUTC time.Time
	Reason *string
}

type BookingRepository interface {
	Create(ctx context.Context, p CreateBookingParams) (domain.Booking, error)

	GetByID(ctx context.Context, id uuid.UUID) (domain.Booking, error)

	ListByRange(ctx context.Context, p ListBookingsByRangeParams) ([]domain.Booking, error)

	Cancel(ctx context.Context, p CancelBookingParams) (domain.Booking, error)
}
