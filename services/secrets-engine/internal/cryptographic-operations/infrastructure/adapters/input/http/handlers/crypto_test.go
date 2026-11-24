package handlers_test

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/dto"
	decryptsecret "github.com/minivault/secrets-engine/internal/cryptographic-operations/application/usecases/decrypt-secret"
	encryptsecret "github.com/minivault/secrets-engine/internal/cryptographic-operations/application/usecases/encrypt-secret"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/exceptions"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/input/http/routes"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/output/aesgcm"
	keymanagement "github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/output/key-management"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/infrastructure/adapters/output/nonce"
)

const (
	id    = "11111111-1111-4111-8111-111111111111"
	other = "22222222-2222-4222-8222-222222222222"
)

var token = strings.Repeat("t", 40)

type fakeUseCase struct {
	called bool
	err    error
	panics bool
}

type fakeEncrypt struct{ *fakeUseCase }

func (f fakeEncrypt) Execute(context.Context, dto.EncryptCommand) (dto.EncryptResult, error) {
	f.called = true
	if f.panics {
		panic("CANARY-9f3c")
	}
	return dto.EncryptResult{Ciphertext: []byte("c"), Nonce: []byte("n"), KeyVersion: 1}, f.err
}

type fakeDecrypt struct{ *fakeUseCase }

func (f fakeDecrypt) Execute(context.Context, dto.DecryptCommand) (dto.DecryptResult, error) {
	f.called = true
	return dto.DecryptResult{}, f.err
}

func post(h http.Handler, path, auth, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/internal/v1/"+path, strings.NewReader(body))
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	req.Header.Set("X-Correlation-Id", "corr-12345")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func withFakes(f *fakeUseCase) http.Handler {
	return routes.New(routes.Dependencies{AuthToken: token, Encrypt: fakeEncrypt{f}, Decrypt: fakeDecrypt{f}})
}

const encryptBody = `{"projectId":"` + id + `","environmentId":"` + id + `","secretId":"` + id + `","plaintext":"aGk="}`

func TestRejectsUnauthenticatedCallers(t *testing.T) {
	for _, auth := range []string{"", "Bearer ", "Bearer wrong", "Bearer " + token[:39], "Bearer " + token + "x", token, "Basic " + token} {
		for _, path := range []string{"encrypt", "decrypt"} {
			f := &fakeUseCase{}
			rec := post(withFakes(f), path, auth, encryptBody)
			if rec.Code != http.StatusUnauthorized || f.called {
				t.Errorf("%s with %q: %d", path, auth, rec.Code)
			}
		}
	}
}

func TestRefusesEveryCallWithoutConfiguredToken(t *testing.T) {
	f := &fakeUseCase{}
	h := routes.New(routes.Dependencies{Encrypt: fakeEncrypt{f}, Decrypt: fakeDecrypt{f}})
	if rec := post(h, "encrypt", "Bearer ", encryptBody); rec.Code != http.StatusUnauthorized || f.called {
		t.Fatal(rec.Code)
	}
}

func TestRequestValidation(t *testing.T) {
	cases := map[string]struct {
		body   string
		status int
	}{
		"malformed JSON": {"{", 400},
		"bad base64":     {strings.Replace(encryptBody, "aGk=", "%%%", 1), 400},
		"unknown field":  {strings.Replace(encryptBody, "{", `{"x":1,`, 1), 400},
		"trailing data":  {encryptBody + "{}", 400},
		"no plaintext":   {strings.Replace(encryptBody, `,"plaintext":"aGk="`, "", 1), 400},
		"too large":      {strings.Replace(encryptBody, "aGk=", strings.Repeat("A", 65*1024), 1), 413},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			f := &fakeUseCase{}
			rec := post(withFakes(f), "encrypt", "Bearer "+token, tc.body)
			if rec.Code != tc.status || f.called {
				t.Fatalf("got %d %s", rec.Code, rec.Body)
			}
			if !strings.Contains(rec.Body.String(), `"correlationId":"corr-12345"`) {
				t.Fatal("no correlation id", rec.Body)
			}
		})
	}
}

func TestErrorMapping(t *testing.T) {
	cases := []struct {
		err    error
		status int
		code   string
	}{
		{exceptions.ErrInvalidContext, 400, "INVALID_REQUEST"},
		{exceptions.ErrInvalidNonce, 400, "INVALID_REQUEST"},
		{exceptions.ErrInvalidCiphertext, 400, "INVALID_REQUEST"},
		{exceptions.ErrInvalidKeyVersion, 400, "INVALID_REQUEST"},
		{exceptions.ErrPlaintextTooLarge, 413, "PAYLOAD_TOO_LARGE"},
		{exceptions.ErrUnknownKeyVersion, 422, "UNKNOWN_KEY_VERSION"},
		{exceptions.ErrDecryptionFailed, 422, "DECRYPTION_FAILED"},
		{errors.New("CANARY-9f3c"), 500, "INTERNAL_ERROR"},
	}
	for _, tc := range cases {
		rec := post(withFakes(&fakeUseCase{err: tc.err}), "encrypt", "Bearer "+token, encryptBody)
		if rec.Code != tc.status || !strings.Contains(rec.Body.String(), tc.code) || strings.Contains(rec.Body.String(), "CANARY") {
			t.Errorf("%v: %d %s", tc.err, rec.Code, rec.Body)
		}
	}
}

func TestPanicIsContained(t *testing.T) {
	var log bytes.Buffer
	f := &fakeUseCase{panics: true}
	h := routes.New(routes.Dependencies{AuthToken: token, Encrypt: fakeEncrypt{f}, Decrypt: fakeDecrypt{f}, Logger: slog.New(slog.NewJSONHandler(&log, nil))})
	rec := post(h, "encrypt", "Bearer "+token, encryptBody)
	if rec.Code != 500 || strings.Contains(rec.Body.String()+log.String(), "CANARY") {
		t.Fatal(rec.Code, rec.Body, log.String())
	}
}

func realStack(t *testing.T, log *bytes.Buffer, active uint32) http.Handler {
	t.Helper()
	keys, err := keymanagement.NewStaticKeyProvider(map[uint32][]byte{1: bytes.Repeat([]byte{1}, 32), 2: bytes.Repeat([]byte{2}, 32)}, active)
	if err != nil {
		t.Fatal(err)
	}
	c := aesgcm.New()
	return routes.New(routes.Dependencies{
		AuthToken: token,
		Encrypt:   encryptsecret.New(c, keys, nonce.Random{}),
		Decrypt:   decryptsecret.New(c, keys),
		Logger:    slog.New(slog.NewJSONHandler(log, nil)),
	})
}

func TestFullStack(t *testing.T) {
	var log bytes.Buffer
	const canary = "CANARY-9f3c"
	encoded := base64.StdEncoding.EncodeToString([]byte(canary))
	auth := "Bearer " + token

	rec := post(realStack(t, &log, 1), "encrypt", auth, strings.Replace(encryptBody, "aGk=", encoded, 1))
	if rec.Code != 200 || rec.Header().Get("Cache-Control") != "no-store" {
		t.Fatal(rec.Code, rec.Body)
	}
	var sealed struct {
		Ciphertext string `json:"ciphertext"`
		Nonce      string `json:"nonce"`
		KeyVersion int    `json:"keyVersion"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &sealed); err != nil || sealed.KeyVersion != 1 {
		t.Fatal(err, sealed)
	}

	decrypt := func(changes map[string]any) *httptest.ResponseRecorder {
		body := map[string]any{"projectId": id, "environmentId": id, "secretId": id, "ciphertext": sealed.Ciphertext, "nonce": sealed.Nonce, "keyVersion": 1}
		for k, v := range changes {
			body[k] = v
		}
		raw, _ := json.Marshal(body)
		return post(realStack(t, &log, 2), "decrypt", auth, string(raw)) // version 2 is active, version 1 still opens
	}
	if rec := decrypt(nil); rec.Code != 200 || rec.Body.String() != `{"plaintext":"`+encoded+`"}` {
		t.Fatal(rec.Code, rec.Body)
	}
	for field, value := range map[string]any{"projectId": other, "environmentId": other, "secretId": other, "keyVersion": 2} {
		if rec := decrypt(map[string]any{field: value}); rec.Code != 422 || !strings.Contains(rec.Body.String(), "DECRYPTION_FAILED") {
			t.Errorf("%s: %d %s", field, rec.Code, rec.Body)
		}
	}
	if rec := decrypt(map[string]any{"keyVersion": 9}); rec.Code != 422 {
		t.Fatal(rec.Code)
	}
	if rec := post(realStack(t, &log, 2), "encrypt", auth, encryptBody); !strings.Contains(rec.Body.String(), `"keyVersion":2`) {
		t.Fatal("new secrets must use the active key")
	}
	if log.Len() == 0 {
		t.Fatal("requests must be logged")
	}
	for _, leak := range []string{canary, encoded, token} {
		if strings.Contains(log.String(), leak) {
			t.Fatal("log leaks", leak)
		}
	}
}
