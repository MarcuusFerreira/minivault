// Package exceptions holds the cryptographic domain errors. They carry no input data.
package exceptions

import "errors"

var (
	ErrInvalidContext    = errors.New("encryption context identifiers must be UUIDs")
	ErrInvalidNonce      = errors.New("nonce must have 12 bytes")
	ErrInvalidCiphertext = errors.New("ciphertext must have at least 16 bytes")
	ErrInvalidKeyVersion = errors.New("key version must be at least 1")
	ErrInvalidKey        = errors.New("encryption key must have 32 bytes")
	ErrUnknownKeyVersion = errors.New("unknown key version")
	ErrDecryptionFailed  = errors.New("decryption failed")
	ErrPlaintextTooLarge = errors.New("plaintext exceeds 32768 bytes")
)
