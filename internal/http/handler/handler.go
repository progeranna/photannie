package handler

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"

	"photannie/internal/api"
	"photannie/internal/domain"
	"photannie/internal/service/booking"
)

type SessionStore interface {
	New() (string, error)
	Exists(sessionID string) bool
}

type Deps struct {
	Booking booking.Service

	AdminPassword string
	CookieName    string
	SecureCookie  bool

	Sessions SessionStore
	Logger   *slog.Logger
}

type Handler struct {
	deps Deps
	loc  *time.Location
}

func New(deps Deps) *Handler {
	if deps.Logger == nil {
		deps.Logger = slog.Default()
	}
	if deps.CookieName == "" {
		deps.CookieName = "photannie_session"
	}

	loc, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		deps.Logger.Error("failed to load Europe/Moscow tz, fallback to Local", "err", err)
		loc = time.Local
	}

	return &Handler{deps: deps, loc: loc}
}

var _ api.ServerInterface = (*Handler)(nil)

func OapiBindingErrorHandler(log *slog.Logger) func(w http.ResponseWriter, r *http.Request, err error) {
	if log == nil {
		log = slog.Default()
	}
	return func(w http.ResponseWriter, r *http.Request, err error) {
		log.Info("oapi bind error",
			"method", r.Method,
			"path", r.URL.Path,
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Code:    "bad_request",
			Message: err.Error(),
		})
	}
}

func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339Nano),
	})
}

func (h *Handler) GetFreeSlotsByDate(w http.ResponseWriter, r *http.Request, params api.GetFreeSlotsByDateParams) {
	date := params.Date.Time

	free, err := h.deps.Booking.GetFreeSlots(r.Context(), date)
	if err != nil {
		h.writeServiceError(w, r, err, "GetFreeSlotsByDate")
		return
	}

	writeJSON(w, http.StatusOK, api.FreeSlotsResponse{
		Date:      params.Date,
		FreeSlots: free,
	})
}

func (h *Handler) CreateBooking(w http.ResponseWriter, r *http.Request, _ api.CreateBookingParams) {
	var body api.BookingCreateRequest
	if err := decodeJSON(r, &body); err != nil {
		h.deps.Logger.Info("bad request body",
			"op", "CreateBooking",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Code:    "bad_request",
			Message: "Некорректное тело запроса",
		})
		return
	}

	created, err := h.deps.Booking.CreateBooking(r.Context(), booking.CreateBookingInput{
		Date:            body.Date.Time,
		StartTimeHHMM:   body.StartTime,
		DurationMinutes: body.DurationMinutes,
		ClientName:      body.Name,
		ClientPhone:     body.Phone,
		Comment:         body.Comment,
	})
	if err != nil {
		h.writeServiceError(w, r, err, "CreateBooking")
		return
	}

	writeJSON(w, http.StatusCreated, h.toCreateResponse(created))
}

func (h *Handler) AdminSessionLogin(w http.ResponseWriter, r *http.Request) {
	var body api.AdminSessionLoginRequest
	if err := decodeJSON(r, &body); err != nil {
		h.deps.Logger.Info("bad request body",
			"op", "AdminSessionLogin",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Code:    "bad_request",
			Message: "Некорректное тело запроса",
		})
		return
	}

	if body.Password == "" || body.Password != h.deps.AdminPassword {
		writeJSON(w, http.StatusUnauthorized, api.ErrorResponse{
			Code:    "admin_unauthorized",
			Message: "Неверный пароль",
		})
		return
	}

	if h.deps.Sessions == nil {
		h.deps.Logger.Error("session store is nil",
			"op", "AdminSessionLogin",
			"request_id", middleware.GetReqID(r.Context()),
		)
		writeJSON(w, http.StatusInternalServerError, api.ErrorResponse{
			Code:    "internal_error",
			Message: "Ошибка сервера",
		})
		return
	}

	sid, err := h.deps.Sessions.New()
	if err != nil {
		h.deps.Logger.Error("failed to create session",
			"op", "AdminSessionLogin",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		writeJSON(w, http.StatusInternalServerError, api.ErrorResponse{
			Code:    "internal_error",
			Message: "Ошибка сервера",
		})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     h.deps.CookieName,
		Value:    sid,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   h.deps.SecureCookie,
	})

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) AdminListBookingsByDate(w http.ResponseWriter, r *http.Request, params api.AdminListBookingsByDateParams) {
	items, err := h.deps.Booking.ListBookingsByDate(r.Context(), params.Date.Time)
	if err != nil {
		h.writeServiceError(w, r, err, "AdminListBookingsByDate")
		return
	}

	filter := api.BookingStatusFilterAll
	if params.Status != nil {
		filter = *params.Status
	}

	out := make([]api.BookingSummary, 0, len(items))
	for _, b := range items {
		if !matchesStatusFilter(b, filter) {
			continue
		}
		out = append(out, h.toSummary(b))
	}

	writeJSON(w, http.StatusOK, api.AdminBookingsByDateResponse{
		Date:  params.Date,
		Items: out,
	})
}

func matchesStatusFilter(b domain.Booking, f api.BookingStatusFilter) bool {
	switch f {
	case api.BookingStatusFilterCancelled:
		return b.Status == domain.BookingStatusCancelled
	case api.BookingStatusFilterActive:
		return b.Status == domain.BookingStatusActive
	case api.BookingStatusFilterAll:
		fallthrough
	default:
		return true
	}
}

func (h *Handler) AdminGetBooking(w http.ResponseWriter, r *http.Request, bookingId openapi_types.UUID) {
	id := uuid.UUID(bookingId)

	b, err := h.deps.Booking.GetBooking(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, r, err, "AdminGetBooking")
		return
	}

	writeJSON(w, http.StatusOK, h.toDetail(b))
}

func (h *Handler) AdminCancelBooking(w http.ResponseWriter, r *http.Request, bookingId openapi_types.UUID, _ api.AdminCancelBookingParams) {
	id := uuid.UUID(bookingId)

	var req api.CancelBookingRequest
	if err := decodeJSONAllowEmpty(r, &req); err != nil {
		h.deps.Logger.Info("bad request body",
			"op", "AdminCancelBooking",
			"booking_id", id.String(),
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Code:    "bad_request",
			Message: "Некорректное тело запроса",
		})
		return
	}

	b, err := h.deps.Booking.CancelBooking(r.Context(), id, req.Reason)
	if err != nil {
		h.writeServiceError(w, r, err, "AdminCancelBooking")
		return
	}

	writeJSON(w, http.StatusOK, h.toDetail(b))
}

func (h *Handler) toAPIStatus(s domain.BookingStatus) api.BookingStatus {
	switch s {
	case domain.BookingStatusCancelled:
		return api.BookingStatusCancelled
	case domain.BookingStatusActive:
		fallthrough
	default:
		return api.BookingStatusActive
	}
}

func (h *Handler) toCreateResponse(b domain.Booking) api.BookingCreateResponse {
	startLocal := b.StartAt.In(h.loc)
	endLocal := b.EndAt.In(h.loc)
	d := dateOnly(startLocal, h.loc)

	return api.BookingCreateResponse{
		Id:              openapi_types.UUID(b.ID),
		Date:            openapi_types.Date{Time: d},
		StartTime:       startLocal.Format("15:04"),
		EndTime:         endLocal.Format("15:04"),
		DurationMinutes: int(b.EndAt.Sub(b.StartAt) / time.Minute),
		Status:          h.toAPIStatus(b.Status),
		CreatedAt:       b.CreatedAt,
	}
}

func (h *Handler) toSummary(b domain.Booking) api.BookingSummary {
	startLocal := b.StartAt.In(h.loc)
	endLocal := b.EndAt.In(h.loc)
	d := dateOnly(startLocal, h.loc)

	return api.BookingSummary{
		Id:              openapi_types.UUID(b.ID),
		Date:            openapi_types.Date{Time: d},
		StartTime:       startLocal.Format("15:04"),
		EndTime:         endLocal.Format("15:04"),
		DurationMinutes: int(b.EndAt.Sub(b.StartAt) / time.Minute),
		Status:          h.toAPIStatus(b.Status),
		CreatedAt:       b.CreatedAt,

		ClientName:  b.ClientName,
		ClientPhone: b.ClientPhone,
		Comment:     b.Comment,

		CancelledAt: b.CancelledAt,
	}
}

func (h *Handler) toDetail(b domain.Booking) api.BookingDetail {
	startLocal := b.StartAt.In(h.loc)
	endLocal := b.EndAt.In(h.loc)
	d := dateOnly(startLocal, h.loc)

	return api.BookingDetail{
		Id:              openapi_types.UUID(b.ID),
		Date:            openapi_types.Date{Time: d},
		StartTime:       startLocal.Format("15:04"),
		EndTime:         endLocal.Format("15:04"),
		DurationMinutes: int(b.EndAt.Sub(b.StartAt) / time.Minute),
		Status:          h.toAPIStatus(b.Status),
		CreatedAt:       b.CreatedAt,

		ClientName:  b.ClientName,
		ClientPhone: b.ClientPhone,
		Comment:     b.Comment,

		CancelledAt:  b.CancelledAt,
		CancelReason: b.CancelReason,
	}
}

func dateOnly(t time.Time, loc *time.Location) time.Time {
	tt := t.In(loc)
	return time.Date(tt.Year(), tt.Month(), tt.Day(), 0, 0, 0, 0, loc)
}

func (h *Handler) writeServiceError(w http.ResponseWriter, r *http.Request, err error, op string) {
	reqID := middleware.GetReqID(r.Context())

	var verr domain.ValidationError
	if errors.As(err, &verr) || errors.Is(err, domain.ErrValidation) {
		fields := make([]api.FieldError, 0, len(verr.Fields))
		for _, f := range verr.Fields {
			fields = append(fields, api.FieldError{
				Field:   f.Field,
				Message: f.Message,
			})
		}

		h.deps.Logger.Info("validation error", "op", op, "request_id", reqID, "err", err)
		writeJSON(w, http.StatusUnprocessableEntity, api.ValidationErrorResponse{
			Code:    api.ValidationErrorResponseCodeValidationError,
			Message: "Ошибка валидации",
			Fields:  fields,
		})
		return
	}

	if errors.Is(err, domain.ErrConflict) {
		h.deps.Logger.Info("time conflict", "op", op, "request_id", reqID, "err", err)
		writeJSON(w, http.StatusConflict, api.ErrorResponse{
			Code:    "time_taken",
			Message: "Слот уже занят, выберите другое время",
		})
		return
	}

	if errors.Is(err, domain.ErrNotFound) {
		h.deps.Logger.Info("not found", "op", op, "request_id", reqID, "err", err)
		writeJSON(w, http.StatusNotFound, api.ErrorResponse{
			Code:    "not_found",
			Message: "Запись не найдена",
		})
		return
	}
	h.deps.Logger.Error("internal error", "op", op, "request_id", reqID, "err", err)
	writeJSON(w, http.StatusInternalServerError, api.ErrorResponse{
		Code:    "internal_error",
		Message: "Ошибка сервера",
	})
}

func decodeJSON(r *http.Request, dst any) error {
	if r.Body == nil || r.Body == http.NoBody {
		return io.EOF
	}
	defer r.Body.Close()

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		return err
	}
	if dec.More() {
		return errors.New("unexpected extra JSON content")
	}
	return nil
}

func decodeJSONAllowEmpty(r *http.Request, dst any) error {
	if r.Body == nil || r.Body == http.NoBody {
		return nil
	}
	defer r.Body.Close()

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	err := dec.Decode(dst)
	if err == io.EOF {
		return nil
	}
	return err
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)

	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}
