// Package aesgcm adapts the standard library's AES-256-GCM to the Cipher port.
package aesgcm

import (
	"crypto/aes"
	"crypto/cipher"

	"github.com/minivault/secrets-engine/internal/cryptographic-operations/application/ports/output"
	"github.com/minivault/secrets-engine/internal/cryptographic-operations/domain/valueobjects"
)

type Cipher struct{}

var _ output.Cipher = Cipher{}

func New() Cipher { return Cipher{} }

func (Cipher) Seal(key valueobjects.EncryptionKey, nonce valueobjects.Nonce, plaintext, aad []byte) (valueobjects.Ciphertext, error) {
	aead, err := aeadFor(key)
	if err != nil {
		return valueobjects.Ciphertext{}, err
	}
	return valueobjects.NewCiphertext(aead.Seal(nil, nonce.Bytes(), plaintext, aad))
}

func (Cipher) Open(key valueobjects.EncryptionKey, nonce valueobjects.Nonce, ciphertext valueobjects.Ciphertext, aad []byte) ([]byte, error) {
	aead, err := aeadFor(key)
	if err != nil {
		return nil, err
	}
	return aead.Open(nil, nonce.Bytes(), ciphertext.Bytes(), aad)
}

func aeadFor(key valueobjects.EncryptionKey) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key.Material())
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}
