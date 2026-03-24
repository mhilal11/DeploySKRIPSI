package admin

import "testing"

func TestCanArchiveLetterStatus(t *testing.T) {
	testCases := []struct {
		status   string
		expected bool
	}{
		{status: "Didisposisi", expected: true},
		{status: "Disposisi Final", expected: true},
		{status: "Ditolak HR", expected: true},
		{status: "Diajukan", expected: false},
		{status: "Menunggu HR", expected: false},
	}

	for _, testCase := range testCases {
		if actual := canArchiveLetterStatus(testCase.status); actual != testCase.expected {
			t.Fatalf("status %q expected %v, got %v", testCase.status, testCase.expected, actual)
		}
	}
}
