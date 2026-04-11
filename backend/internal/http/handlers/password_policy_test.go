package handlers

import "testing"

func TestPasswordMeetsPolicy(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name     string
		password string
		valid    bool
	}{
		{name: "valid minimum", password: "Abcdef1!", valid: true},
		{name: "valid maximum", password: "Abcdefgh1234!@X", valid: true},
		{name: "too short", password: "Ab1!", valid: false},
		{name: "too long", password: "Abcdefgh1234!@XYZ", valid: false},
		{name: "missing upper", password: "abcdefg1!", valid: false},
		{name: "missing lower", password: "ABCDEFG1!", valid: false},
		{name: "missing digit", password: "Abcdefgh!", valid: false},
		{name: "missing special", password: "Abcdefg12", valid: false},
		{name: "unsupported special only", password: "Abcdefg1?", valid: false},
	}

	for _, testCase := range testCases {
		testCase := testCase
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			if got := PasswordMeetsPolicy(testCase.password); got != testCase.valid {
				t.Fatalf("PasswordMeetsPolicy(%q) = %v, want %v", testCase.password, got, testCase.valid)
			}
		})
	}
}

func TestGeneratePolicyCompliantPassword(t *testing.T) {
	t.Parallel()

	password, err := GeneratePolicyCompliantPassword(12)
	if err != nil {
		t.Fatalf("GeneratePolicyCompliantPassword returned error: %v", err)
	}

	if len([]rune(password)) != 12 {
		t.Fatalf("generated password length = %d, want 12", len([]rune(password)))
	}

	if !PasswordMeetsPolicy(password) {
		t.Fatalf("generated password does not satisfy password policy: %q", password)
	}
}
