package dto

type EncryptCommand struct {
	ProjectID, EnvironmentID, SecretID string
	Plaintext                          []byte
}

type EncryptResult struct {
	Ciphertext, Nonce []byte
	KeyVersion        uint32
}

type DecryptCommand struct {
	ProjectID, EnvironmentID, SecretID string
	Ciphertext, Nonce                  []byte
	KeyVersion                         uint32
}

type DecryptResult struct {
	Plaintext []byte
}
