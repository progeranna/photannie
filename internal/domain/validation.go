package domain

import (
	"errors"
	"fmt"
	"strings"
)

var ErrValidation = errors.New("validation")

type FieldError struct {
	Field   string
	Message string
}

type ValidationError struct {
	Fields []FieldError
}

func (e ValidationError) Error() string {
	if len(e.Fields) == 0 {
		return "validation error"
	}
	var b strings.Builder
	b.WriteString("validation error: ")
	for i, fe := range e.Fields {
		if i > 0 {
			b.WriteString("; ")
		}
		b.WriteString(fmt.Sprintf("%s: %s", fe.Field, fe.Message))
	}
	return b.String()
}

func (e ValidationError) Unwrap() error { return ErrValidation }

func (e ValidationError) Add(field, message string) ValidationError {
	e.Fields = append(e.Fields, FieldError{Field: field, Message: message})
	return e
}

func (e ValidationError) IsEmpty() bool { return len(e.Fields) == 0 }
