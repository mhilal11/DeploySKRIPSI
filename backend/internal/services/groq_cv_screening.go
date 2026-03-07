package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	maxCVPromptChars          = 16000
	defaultGroqRequestTimeout = 60 * time.Second
)

type CVScreeningInput struct {
	CandidateName    string
	Division         string
	Position         string
	JobDescription   string
	JobRequirements  []string
	ProfileSkills    string
	EducationSummary string
	Experience       string
	CVText           string
}

type CVScreeningResult struct {
	MatchScore         float64  `json:"match_score"`
	Recommendation     string   `json:"recommendation"`
	Summary            string   `json:"summary"`
	Strengths          []string `json:"strengths"`
	Gaps               []string `json:"gaps"`
	RedFlags           []string `json:"red_flags"`
	InterviewQuestions []string `json:"interview_questions"`
}

type CVScreeningAttempt struct {
	Model      string `json:"model"`
	StatusCode int    `json:"status_code,omitempty"`
	Error      string `json:"error,omitempty"`
	DurationMS int64  `json:"duration_ms"`
}

type CVScreeningTokenUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type CVScreeningClient struct {
	apiKey     string
	baseURL    string
	modelChain []string
	httpClient *http.Client
}

type groqAPIError struct {
	StatusCode int
	Message    string
}

func (e *groqAPIError) Error() string {
	if e == nil {
		return ""
	}
	if e.StatusCode <= 0 {
		return e.Message
	}
	return fmt.Sprintf("groq api status %d: %s", e.StatusCode, e.Message)
}

func NewGroqCVScreeningClient(apiKey, baseURL string, modelChain []string, timeout time.Duration) *CVScreeningClient {
	baseURL = strings.TrimSpace(baseURL)
	if baseURL == "" {
		baseURL = "https://api.groq.com/openai/v1"
	}
	if timeout <= 0 {
		timeout = defaultGroqRequestTimeout
	}
	return &CVScreeningClient{
		apiKey:     strings.TrimSpace(apiKey),
		baseURL:    strings.TrimRight(baseURL, "/"),
		modelChain: dedupeModels(modelChain),
		httpClient: &http.Client{Timeout: timeout},
	}
}

func (c *CVScreeningClient) Enabled() bool {
	return c != nil && c.apiKey != "" && len(c.modelChain) > 0
}

func (c *CVScreeningClient) Models() []string {
	if c == nil {
		return nil
	}
	out := make([]string, len(c.modelChain))
	copy(out, c.modelChain)
	return out
}

func (c *CVScreeningClient) ScreenCV(
	ctx context.Context,
	input CVScreeningInput,
) (CVScreeningResult, string, []CVScreeningAttempt, CVScreeningTokenUsage, string, error) {
	if !c.Enabled() {
		return CVScreeningResult{}, "", nil, CVScreeningTokenUsage{}, "", errors.New("groq client belum dikonfigurasi")
	}

	attempts := make([]CVScreeningAttempt, 0, len(c.modelChain))
	var lastErr error
	for _, model := range c.modelChain {
		start := time.Now()
		result, usage, raw, err := c.screenWithModel(ctx, model, input)
		attempt := CVScreeningAttempt{
			Model:      model,
			DurationMS: time.Since(start).Milliseconds(),
		}
		if err != nil {
			attempt.Error = err.Error()
			var apiErr *groqAPIError
			if errors.As(err, &apiErr) {
				attempt.StatusCode = apiErr.StatusCode
			}
			attempts = append(attempts, attempt)
			lastErr = err
			continue
		}
		attempts = append(attempts, attempt)
		return result, model, attempts, usage, raw, nil
	}

	if lastErr == nil {
		lastErr = errors.New("semua model fallback gagal dipakai")
	}
	return CVScreeningResult{}, "", attempts, CVScreeningTokenUsage{}, "", lastErr
}

func (c *CVScreeningClient) screenWithModel(
	ctx context.Context,
	model string,
	input CVScreeningInput,
) (CVScreeningResult, CVScreeningTokenUsage, string, error) {
	payload := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": groqScreeningSystemPrompt(),
			},
			{
				"role":    "user",
				"content": groqScreeningUserPrompt(input),
			},
		},
		"temperature": 0.1,
		"max_tokens":  900,
		"top_p":       0.95,
		"response_format": map[string]string{
			"type": "json_object",
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return CVScreeningResult{}, CVScreeningTokenUsage{}, "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return CVScreeningResult{}, CVScreeningTokenUsage{}, "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return CVScreeningResult{}, CVScreeningTokenUsage{}, "", err
	}
	defer resp.Body.Close()

	rawBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return CVScreeningResult{}, CVScreeningTokenUsage{}, "", err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return CVScreeningResult{}, CVScreeningTokenUsage{}, "", &groqAPIError{
			StatusCode: resp.StatusCode,
			Message:    parseGroqErrorMessage(rawBody),
		}
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage CVScreeningTokenUsage `json:"usage"`
	}
	if err := json.Unmarshal(rawBody, &parsed); err != nil {
		return CVScreeningResult{}, CVScreeningTokenUsage{}, "", err
	}
	if len(parsed.Choices) == 0 {
		return CVScreeningResult{}, CVScreeningTokenUsage{}, "", errors.New("respons model tidak memiliki choices")
	}

	content := strings.TrimSpace(parsed.Choices[0].Message.Content)
	if content == "" {
		return CVScreeningResult{}, CVScreeningTokenUsage{}, "", errors.New("konten respons model kosong")
	}

	result, err := parseScreeningContent(content)
	if err != nil {
		return CVScreeningResult{}, CVScreeningTokenUsage{}, content, err
	}

	return result, parsed.Usage, content, nil
}

func groqScreeningSystemPrompt() string {
	return strings.Join([]string{
		"Anda adalah AI recruiter untuk screening CV kandidat.",
		"Tugas Anda menilai kecocokan CV terhadap lowongan kerja berdasarkan bukti yang tersedia.",
		"Balas HANYA JSON valid (tanpa markdown, tanpa teks lain).",
		"Gunakan skala match_score 0-100.",
		"JSON wajib punya key: match_score, recommendation, summary, strengths, gaps, red_flags, interview_questions.",
		"strengths, gaps, red_flags, interview_questions selalu array string.",
	}, " ")
}

func groqScreeningUserPrompt(input CVScreeningInput) string {
	requirements := "-"
	if len(input.JobRequirements) > 0 {
		requirements = strings.Join(input.JobRequirements, "\n- ")
		requirements = "- " + requirements
	}

	builder := strings.Builder{}
	builder.WriteString("Nilai kecocokan kandidat berikut.\n\n")
	builder.WriteString(fmt.Sprintf("Nama Kandidat: %s\n", sanitizePromptText(input.CandidateName, 150)))
	builder.WriteString(fmt.Sprintf("Divisi: %s\n", sanitizePromptText(input.Division, 120)))
	builder.WriteString(fmt.Sprintf("Posisi: %s\n\n", sanitizePromptText(input.Position, 120)))
	builder.WriteString("Deskripsi Pekerjaan:\n")
	builder.WriteString(sanitizePromptText(input.JobDescription, 2500))
	builder.WriteString("\n\nPersyaratan Lowongan:\n")
	builder.WriteString(requirements)
	builder.WriteString("\n\nRingkasan Skills Profil:\n")
	builder.WriteString(sanitizePromptText(input.ProfileSkills, 1500))
	builder.WriteString("\n\nRingkasan Pendidikan:\n")
	builder.WriteString(sanitizePromptText(input.EducationSummary, 1500))
	builder.WriteString("\n\nRingkasan Pengalaman:\n")
	builder.WriteString(sanitizePromptText(input.Experience, 2000))
	builder.WriteString("\n\nTeks CV (hasil ekstraksi):\n")
	builder.WriteString(sanitizePromptText(input.CVText, maxCVPromptChars))
	builder.WriteString("\n\n")
	builder.WriteString("Aturan rekomendasi: gunakan salah satu Strong Match, Potential Match, Needs Review, Not Recommended.")
	return builder.String()
}

func parseScreeningContent(content string) (CVScreeningResult, error) {
	jsonText := extractJSONObject(content)
	if jsonText == "" {
		return CVScreeningResult{}, errors.New("respons model bukan JSON object valid")
	}

	var payload CVScreeningResult
	if err := json.Unmarshal([]byte(jsonText), &payload); err != nil {
		return CVScreeningResult{}, err
	}

	payload.MatchScore = clampScore(payload.MatchScore)
	payload.Recommendation = normalizeRecommendation(payload.Recommendation, payload.MatchScore)
	payload.Summary = sanitizePromptText(payload.Summary, 500)
	payload.Strengths = sanitizeStringList(payload.Strengths, 6, 220)
	payload.Gaps = sanitizeStringList(payload.Gaps, 6, 220)
	payload.RedFlags = sanitizeStringList(payload.RedFlags, 5, 220)
	payload.InterviewQuestions = sanitizeStringList(payload.InterviewQuestions, 6, 220)
	return payload, nil
}

func parseGroqErrorMessage(rawBody []byte) string {
	var payload struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(rawBody, &payload); err == nil {
		if strings.TrimSpace(payload.Error.Message) != "" {
			return strings.TrimSpace(payload.Error.Message)
		}
		if strings.TrimSpace(payload.Message) != "" {
			return strings.TrimSpace(payload.Message)
		}
	}
	text := strings.TrimSpace(string(rawBody))
	if text == "" {
		return "unknown error"
	}
	return sanitizePromptText(text, 400)
}

func dedupeModels(models []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(models))
	for _, model := range models {
		trimmed := strings.TrimSpace(model)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

func extractJSONObject(content string) string {
	trimmed := strings.TrimSpace(content)
	if strings.HasPrefix(trimmed, "```") {
		trimmed = strings.TrimPrefix(trimmed, "```json")
		trimmed = strings.TrimPrefix(trimmed, "```")
		trimmed = strings.TrimSuffix(trimmed, "```")
		trimmed = strings.TrimSpace(trimmed)
	}
	if strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}") {
		return trimmed
	}

	start := strings.Index(trimmed, "{")
	end := strings.LastIndex(trimmed, "}")
	if start == -1 || end == -1 || end <= start {
		return ""
	}
	return strings.TrimSpace(trimmed[start : end+1])
}

func sanitizePromptText(value string, maxChars int) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "-"
	}
	value = strings.Join(strings.Fields(value), " ")
	if maxChars <= 0 {
		return value
	}
	runes := []rune(value)
	if len(runes) <= maxChars {
		return value
	}
	return string(runes[:maxChars]) + "..."
}

func sanitizeStringList(list []string, maxItems int, maxChars int) []string {
	if maxItems <= 0 {
		return []string{}
	}
	out := make([]string, 0, minInt(len(list), maxItems))
	for _, item := range list {
		normalized := sanitizePromptText(item, maxChars)
		if normalized == "-" {
			continue
		}
		out = append(out, normalized)
		if len(out) >= maxItems {
			break
		}
	}
	return out
}

func normalizeRecommendation(input string, score float64) string {
	trimmed := strings.TrimSpace(input)
	switch strings.ToLower(trimmed) {
	case "strong match":
		return "Strong Match"
	case "potential match":
		return "Potential Match"
	case "needs review":
		return "Needs Review"
	case "not recommended":
		return "Not Recommended"
	}

	switch {
	case score >= 85:
		return "Strong Match"
	case score >= 70:
		return "Potential Match"
	case score >= 55:
		return "Needs Review"
	default:
		return "Not Recommended"
	}
}

func clampScore(value float64) float64 {
	switch {
	case value < 0:
		return 0
	case value > 100:
		return 100
	default:
		return value
	}
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
