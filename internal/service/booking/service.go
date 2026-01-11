package booking

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"time"

	"github.com/google/uuid"

	"photannie/internal/domain"
	"photannie/internal/repository"
)

type Service interface {
	GetFreeSlots(ctx context.Context, date time.Time) ([]string, error)
	CreateBooking(ctx context.Context, in CreateBookingInput) (domain.Booking, error)

	ListBookingsByDate(ctx context.Context, date time.Time) ([]domain.Booking, error)
	GetBooking(ctx context.Context, id uuid.UUID) (domain.Booking, error)
	CancelBooking(ctx context.Context, id uuid.UUID, reason *string) (domain.Booking, error)
}

type Rules struct {
	Location          *time.Location // Europe/Moscow
	BookingWindowDays int            // 90
	WorkStartHHMM     string         // "09:00"
	WorkEndHHMM       string         // "18:00"
	SlotMinutes       int            // 30
	MaxSessionMinutes int            // 180 (кратно 30)
}

type CreateBookingInput struct {
	Date            time.Time
	StartTimeHHMM   string
	DurationMinutes int

	ClientName  string
	ClientPhone string
	Comment     *string
}

type svc struct {
	repo  repository.BookingRepository
	rules compiledRules
	log   *slog.Logger
}

type compiledRules struct {
	loc               *time.Location
	bookingWindowDays int
	workStartMin      int
	workEndMin        int
	slotMinutes       int
	maxSessionMinutes int
}

var phoneRe = regexp.MustCompile(`^\+7\d{10}$`)

func New(repo repository.BookingRepository, r Rules, log *slog.Logger) (Service, error) {
	if repo == nil {
		return nil, fmt.Errorf("booking service: repo is nil")
	}
	if r.Location == nil {
		return nil, fmt.Errorf("booking service: Rules.Location is nil")
	}
	if log == nil {
		log = slog.Default()
	}
	log = log.With("component", "booking_service")

	ws, err := parseHHMMToMinutes(r.WorkStartHHMM)
	if err != nil {
		return nil, fmt.Errorf("booking service: invalid WorkStartHHMM: %w", err)
	}
	we, err := parseHHMMToMinutes(r.WorkEndHHMM)
	if err != nil {
		return nil, fmt.Errorf("booking service: invalid WorkEndHHMM: %w", err)
	}
	if we <= ws {
		return nil, fmt.Errorf("booking service: WorkEnd must be after WorkStart")
	}
	if r.SlotMinutes != 30 {
		return nil, fmt.Errorf("booking service: SlotMinutes must be 30 in MVP")
	}
	if r.BookingWindowDays <= 0 {
		return nil, fmt.Errorf("booking service: BookingWindowDays must be > 0")
	}
	if r.MaxSessionMinutes < r.SlotMinutes || r.MaxSessionMinutes%r.SlotMinutes != 0 {
		return nil, fmt.Errorf("booking service: MaxSessionMinutes must be multiple of slot and >= slot")
	}

	return &svc{
		repo: repo,
		log:  log,
		rules: compiledRules{
			loc:               r.Location,
			bookingWindowDays: r.BookingWindowDays,
			workStartMin:      ws,
			workEndMin:        we,
			slotMinutes:       r.SlotMinutes,
			maxSessionMinutes: r.MaxSessionMinutes,
		},
	}, nil
}

func (s *svc) GetFreeSlots(ctx context.Context, date time.Time) ([]string, error) {
	dateLocal := s.dateOnlyLocal(date)
	s.log.Debug("GetFreeSlots start", "date", dateLocal.Format("2006-01-02"))

	if err := s.validatePublicDate(date); err != nil {
		s.log.Info("GetFreeSlots validation failed", "date", dateLocal.Format("2006-01-02"), "err", err)
		return nil, err
	}

	dayStartLocal, dayEndLocal := s.dayBoundsLocal(date)

	bookings, err := s.repo.ListByRange(ctx, repository.ListBookingsByRangeParams{
		RangeStart: dayStartLocal.UTC(),
		RangeEnd:   dayEndLocal.UTC(),
	})
	if err != nil {
		s.log.Error("GetFreeSlots repo.ListByRange failed", "date", dateLocal.Format("2006-01-02"), "err", err)
		return nil, err
	}

	nowLocal := time.Now().In(s.rules.loc)
	reqDayLocal := s.dateOnlyLocal(date)
	todayLocal := s.dateOnlyLocal(nowLocal)

	workStartLocal := dayStartLocal.Add(time.Duration(s.rules.workStartMin) * time.Minute)
	workEndLocal := dayStartLocal.Add(time.Duration(s.rules.workEndMin) * time.Minute)

	out := make([]string, 0, 32)
	for slotLocal := workStartLocal; slotLocal.Add(time.Duration(s.rules.slotMinutes) * time.Minute).Before(workEndLocal.Add(time.Nanosecond)); slotLocal = slotLocal.Add(time.Duration(s.rules.slotMinutes) * time.Minute) {
		if reqDayLocal.Equal(todayLocal) && slotLocal.Before(nowLocal) {
			continue
		}

		slotStartUTC := slotLocal.UTC()
		slotEndUTC := slotStartUTC.Add(time.Duration(s.rules.slotMinutes) * time.Minute)

		if isSlotFreeUTC(slotStartUTC, slotEndUTC, bookings) {
			out = append(out, slotLocal.Format("15:04"))
		}
	}

	s.log.Debug("GetFreeSlots done", "date", dateLocal.Format("2006-01-02"), "free_slots", len(out))
	return out, nil
}

func isSlotFreeUTC(slotStartUTC, slotEndUTC time.Time, bookings []domain.Booking) bool {
	for _, b := range bookings {
		if b.Status != domain.BookingStatusActive {
			continue
		}
		if b.StartAt.Before(slotEndUTC) && slotStartUTC.Before(b.EndAt) {
			return false
		}
	}
	return true
}

func (s *svc) CreateBooking(ctx context.Context, in CreateBookingInput) (domain.Booking, error) {
	reqDateLocal := s.dateOnlyLocal(in.Date)
	s.log.Info("CreateBooking start",
		"date", reqDateLocal.Format("2006-01-02"),
		"start_time", in.StartTimeHHMM,
		"duration_min", in.DurationMinutes,
	)

	verr := domain.ValidationError{}

	if err := s.validatePublicDate(in.Date); err != nil {
		s.log.Info("CreateBooking validation failed (date)", "date", reqDateLocal.Format("2006-01-02"), "err", err)
		return domain.Booking{}, err
	}

	if in.ClientName == "" {
		verr = verr.Add("name", "Имя обязательно")
	}
	if !phoneRe.MatchString(in.ClientPhone) {
		verr = verr.Add("phone", "Телефон должен быть в формате +7XXXXXXXXXX")
	}

	startMin, err := parseHHMMToMinutes(in.StartTimeHHMM)
	if err != nil {
		verr = verr.Add("start_time", "Время должно быть в формате HH:MM")
	} else {
		if startMin%s.rules.slotMinutes != 0 {
			verr = verr.Add("start_time", "Время должно быть кратно 30 минутам")
		}
		if startMin < s.rules.workStartMin || startMin >= s.rules.workEndMin {
			verr = verr.Add("start_time", "Время должно быть в пределах рабочего дня")
		}
	}

	if in.DurationMinutes < s.rules.slotMinutes || in.DurationMinutes%s.rules.slotMinutes != 0 {
		verr = verr.Add("duration_minutes", "Длительность должна быть кратна 30 минутам и не меньше 30")
	} else if in.DurationMinutes > s.rules.maxSessionMinutes {
		verr = verr.Add("duration_minutes", "Длительность превышает допустимый максимум")
	}

	if !verr.IsEmpty() {
		s.log.Info("CreateBooking validation failed", "date", reqDateLocal.Format("2006-01-02"), "err", verr)
		return domain.Booking{}, verr
	}

	dayStartLocal, _ := s.dayBoundsLocal(in.Date)
	startLocal := dayStartLocal.Add(time.Duration(startMin) * time.Minute)
	endLocal := startLocal.Add(time.Duration(in.DurationMinutes) * time.Minute)

	workEndLocal := dayStartLocal.Add(time.Duration(s.rules.workEndMin) * time.Minute)
	if endLocal.After(workEndLocal) {
		err := domain.ValidationError{}.Add("duration_minutes", "Интервал выходит за пределы рабочего времени")
		s.log.Info("CreateBooking validation failed (work hours)", "date", reqDateLocal.Format("2006-01-02"), "err", err)
		return domain.Booking{}, err
	}

	nowLocal := time.Now().In(s.rules.loc)
	todayLocal := s.dateOnlyLocal(nowLocal)
	if reqDateLocal.Equal(todayLocal) && startLocal.Before(nowLocal) {
		err := domain.ValidationError{}.Add("start_time", "Нельзя записаться на прошедшее время")
		s.log.Info("CreateBooking validation failed (past time)", "date", reqDateLocal.Format("2006-01-02"), "err", err)
		return domain.Booking{}, err
	}

	startUTC := startLocal.UTC()
	endUTC := endLocal.UTC()

	created, err := s.repo.Create(ctx, repository.CreateBookingParams{
		StartAt:     startUTC,
		EndAt:       endUTC,
		ClientName:  in.ClientName,
		ClientPhone: in.ClientPhone,
		Comment:     in.Comment,
	})
	if err != nil {
		s.log.Info("CreateBooking failed",
			"date", reqDateLocal.Format("2006-01-02"),
			"start_time", in.StartTimeHHMM,
			"duration_min", in.DurationMinutes,
			"err", err,
		)
		return domain.Booking{}, err
	}

	s.log.Info("CreateBooking success",
		"booking_id", created.ID.String(),
		"date", reqDateLocal.Format("2006-01-02"),
		"start_time", in.StartTimeHHMM,
		"duration_min", in.DurationMinutes,
	)
	return created, nil
}

func (s *svc) ListBookingsByDate(ctx context.Context, date time.Time) ([]domain.Booking, error) {
	dateLocal := s.dateOnlyLocal(date)
	s.log.Debug("ListBookingsByDate start", "date", dateLocal.Format("2006-01-02"))

	dayStartLocal, dayEndLocal := s.dayBoundsLocal(date)
	items, err := s.repo.ListByRange(ctx, repository.ListBookingsByRangeParams{
		RangeStart: dayStartLocal.UTC(),
		RangeEnd:   dayEndLocal.UTC(),
	})
	if err != nil {
		s.log.Error("ListBookingsByDate repo.ListByRange failed", "date", dateLocal.Format("2006-01-02"), "err", err)
		return nil, err
	}

	s.log.Debug("ListBookingsByDate done", "date", dateLocal.Format("2006-01-02"), "items", len(items))
	return items, nil
}

func (s *svc) GetBooking(ctx context.Context, id uuid.UUID) (domain.Booking, error) {
	s.log.Debug("GetBooking start", "booking_id", id.String())

	b, err := s.repo.GetByID(ctx, id)
	if err != nil {
		s.log.Info("GetBooking failed", "booking_id", id.String(), "err", err)
		return domain.Booking{}, err
	}

	s.log.Debug("GetBooking success", "booking_id", id.String(), "status", string(b.Status))
	return b, nil
}

func (s *svc) CancelBooking(ctx context.Context, id uuid.UUID, reason *string) (domain.Booking, error) {
	s.log.Info("CancelBooking start", "booking_id", id.String())

	nowUTC := time.Now().UTC()
	b, err := s.repo.Cancel(ctx, repository.CancelBookingParams{
		ID:     id,
		NowUTC: nowUTC,
		Reason: reason,
	})
	if err != nil {
		s.log.Info("CancelBooking failed", "booking_id", id.String(), "err", err)
		return domain.Booking{}, err
	}

	s.log.Info("CancelBooking success", "booking_id", id.String(), "status", string(b.Status))
	return b, nil
}

func (s *svc) validatePublicDate(date time.Time) error {
	d := s.dateOnlyLocal(date)
	nowLocal := time.Now().In(s.rules.loc)
	today := s.dateOnlyLocal(nowLocal)

	if d.Before(today) {
		return domain.ValidationError{}.Add("date", "Дата не может быть в прошлом")
	}

	limit := today.AddDate(0, 0, s.rules.bookingWindowDays)
	if d.After(limit) {
		return domain.ValidationError{}.Add("date", "Дата должна быть в пределах окна записи")
	}

	switch d.Weekday() {
	case time.Saturday, time.Sunday:
		return domain.ValidationError{}.Add("date", "Доступны только будние дни")
	default:
		return nil
	}
}

func (s *svc) dayBoundsLocal(date time.Time) (time.Time, time.Time) {
	d := s.dateOnlyLocal(date)
	return d, d.AddDate(0, 0, 1)
}

func (s *svc) dateOnlyLocal(t time.Time) time.Time {
	tt := t.In(s.rules.loc)
	return time.Date(tt.Year(), tt.Month(), tt.Day(), 0, 0, 0, 0, s.rules.loc)
}

func parseHHMMToMinutes(s string) (int, error) {
	if len(s) != 5 || s[2] != ':' {
		return 0, fmt.Errorf("bad format")
	}
	h1, h2 := s[0], s[1]
	m1, m2 := s[3], s[4]
	if h1 < '0' || h1 > '9' || h2 < '0' || h2 > '9' || m1 < '0' || m1 > '9' || m2 < '0' || m2 > '9' {
		return 0, fmt.Errorf("bad value")
	}
	hh := int(h1-'0')*10 + int(h2-'0')
	mm := int(m1-'0')*10 + int(m2-'0')
	if hh < 0 || hh > 23 || mm < 0 || mm > 59 {
		return 0, fmt.Errorf("bad value")
	}
	return hh*60 + mm, nil
}
