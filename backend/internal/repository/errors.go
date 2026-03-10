package db

import "fmt"

func wrapRepoErr(op string, err error) error {
	if err == nil {
		return nil
	}
	if op == "" {
		return err
	}
	return fmt.Errorf("%s: %w", op, err)
}
