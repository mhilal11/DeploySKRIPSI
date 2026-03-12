package superadmin

import (
	"hris-backend/internal/dto"
	"hris-backend/internal/http/handlers"
	dbrepo "hris-backend/internal/repository"

	"net/http"

	"hris-backend/internal/http/middleware"
	"hris-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type notificationsRepository interface {
	ListUnifiedNotificationsPaged(userID int64, limit, offset int) ([]dbrepo.NotificationRow, error)
	CountPendingHRLetters() (int, error)
	CountPendingRecruitmentApplications() (int, error)
	CountPendingStaffTerminations() (int, error)
	CountNewComplaints() (int, error)
	CountUnreadRecentAuditLogs(userID int64) (int, error)
}

type sqlNotificationsRepository struct {
	db *sqlx.DB
}

func newNotificationsRepository(db *sqlx.DB) notificationsRepository {
	return &sqlNotificationsRepository{db: db}
}

func (r *sqlNotificationsRepository) ListUnifiedNotificationsPaged(userID int64, limit, offset int) ([]dbrepo.NotificationRow, error) {
	return dbrepo.ListUnifiedNotificationsPaged(r.db, userID, limit, offset)
}

func (r *sqlNotificationsRepository) CountPendingHRLetters() (int, error) {
	return dbrepo.CountPendingHRLetters(r.db)
}

func (r *sqlNotificationsRepository) CountPendingRecruitmentApplications() (int, error) {
	return dbrepo.CountPendingRecruitmentApplications(r.db)
}

func (r *sqlNotificationsRepository) CountPendingStaffTerminations() (int, error) {
	return dbrepo.CountPendingStaffTerminations(r.db)
}

func (r *sqlNotificationsRepository) CountNewComplaints() (int, error) {
	return dbrepo.CountNewComplaints(r.db)
}

func (r *sqlNotificationsRepository) CountUnreadRecentAuditLogs(userID int64) (int, error) {
	return dbrepo.CountUnreadRecentAuditLogs(r.db, userID)
}

func SuperAdminNotifications(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user == nil || !(user.Role == models.RoleSuperAdmin || user.IsHumanCapitalAdmin()) {
		handlers.JSONError(c, http.StatusForbidden, "Forbidden")
		return
	}

	db := middleware.GetDB(c)
	repo := newNotificationsRepository(db)
	pagination := handlers.ParsePagination(c, 5, 50)

	sidebarNotifications := map[string]int{
		"super-admin.letters.index":    0,
		"super-admin.recruitment":      0,
		"super-admin.staff.index":      0,
		"super-admin.complaints.index": 0,
		"super-admin.audit-log":        0,
	}

	sidebarNotifications["super-admin.letters.index"], _ = repo.CountPendingHRLetters()
	sidebarNotifications["super-admin.recruitment"], _ = repo.CountPendingRecruitmentApplications()
	sidebarNotifications["super-admin.staff.index"], _ = repo.CountPendingStaffTerminations()
	sidebarNotifications["super-admin.complaints.index"], _ = repo.CountNewComplaints()
	sidebarNotifications["super-admin.audit-log"], _ = repo.CountUnreadRecentAuditLogs(user.ID)

	total := 0
	for _, count := range sidebarNotifications {
		total += count
	}
	lastPage := (total + pagination.Limit - 1) / pagination.Limit
	if lastPage <= 0 {
		lastPage = 1
	}

	rows, _ := repo.ListUnifiedNotificationsPaged(user.ID, pagination.Limit, pagination.Offset)
	items := make([]dto.NotificationItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, dto.NotificationItem{
			ID:          row.ID,
			Type:        row.Type,
			Title:       row.Title,
			Description: row.Description,
			Timestamp:   handlers.DiffForHumans(row.CreatedAt),
			URL:         row.URL,
		})
	}

	c.JSON(http.StatusOK, dto.NotificationListResponse{
		Data:                 items,
		CurrentPage:          pagination.Page,
		LastPage:             lastPage,
		Total:                total,
		PerPage:              pagination.Limit,
		SidebarNotifications: sidebarNotifications,
	})
}
