package modeltypes

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

// JSON is a DB-safe JSON raw value that supports sql.Scanner and driver.Valuer.
type JSON json.RawMessage

func (j *JSON) Scan(value any) error {
	if value == nil {
		*j = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		if len(v) == 0 {
			*j = nil
			return nil
		}
		cp := make([]byte, len(v))
		copy(cp, v)
		*j = JSON(cp)
		return nil
	case string:
		if v == "" {
			*j = nil
			return nil
		}
		*j = JSON([]byte(v))
		return nil
	default:
		return errors.New("invalid JSON value")
	}
}

func (j JSON) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return []byte(j), nil
}

func (j JSON) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return []byte(j), nil
}

func (j *JSON) UnmarshalJSON(data []byte) error {
	if j == nil {
		return errors.New("nil JSON receiver")
	}
	if len(data) == 0 || string(data) == "null" {
		*j = nil
		return nil
	}
	cp := make([]byte, len(data))
	copy(cp, data)
	*j = JSON(cp)
	return nil
}

// JSONMap is a helper for json columns that should deserialize into map.
type JSONMap map[string]any

func (j *JSONMap) Scan(value any) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("invalid JSONMap value")
	}
	if len(bytes) == 0 {
		*j = nil
		return nil
	}
	var out map[string]any
	if err := json.Unmarshal(bytes, &out); err != nil {
		return err
	}
	*j = out
	return nil
}

func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

type JSONArray []any

func (j *JSONArray) Scan(value any) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("invalid JSONArray value")
	}
	if len(bytes) == 0 {
		*j = nil
		return nil
	}
	var out []any
	if err := json.Unmarshal(bytes, &out); err != nil {
		return err
	}
	*j = out
	return nil
}

func (j JSONArray) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}
