package domain

import (
	"errors"
)

var (
	ErrNotFound = errors.New("not found")

	ErrConflict = errors.New("conflict")

	ErrUnauthorized = errors.New("unauthorized")
)

func (e ValidationError) With(field, message string) ValidationError {
	e.Fields = append(e.Fields, FieldError{Field: field, Message: message})
	return e
}
