package session

import (
	"crypto/rand"
	"encoding/base64"
	"sync"
)

type MemoryStore struct {
	mu sync.RWMutex
	m  map[string]struct{}
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{m: make(map[string]struct{}, 16)}
}

func (s *MemoryStore) New() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	id := base64.RawURLEncoding.EncodeToString(b)

	s.mu.Lock()
	s.m[id] = struct{}{}
	s.mu.Unlock()

	return id, nil
}

func (s *MemoryStore) Exists(sessionID string) bool {
	s.mu.RLock()
	_, ok := s.m[sessionID]
	s.mu.RUnlock()
	return ok
}
