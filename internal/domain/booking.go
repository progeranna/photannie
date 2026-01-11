package domain

import (
	"time"

	"github.com/google/uuid"
)

type BookingStatus string

const (
	BookingStatusActive    BookingStatus = "active"
	BookingStatusCancelled BookingStatus = "cancelled"
)

type Booking struct {
	ID uuid.UUID

	StartAt time.Time
	EndAt   time.Time

	ClientName  string
	ClientPhone string
	Comment     *string

	Status BookingStatus

	CreatedAt    time.Time
	CancelledAt  *time.Time
	CancelReason *string
}

func (b Booking) IsCancelled() bool { return b.Status == BookingStatusCancelled }
