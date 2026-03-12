package dto

type NotificationItem struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Timestamp   string `json:"timestamp"`
	URL         string `json:"url"`
}

type NotificationListResponse struct {
	Data                 []NotificationItem `json:"data"`
	CurrentPage          int                `json:"current_page"`
	LastPage             int                `json:"last_page"`
	Total                int                `json:"total"`
	PerPage              int                `json:"per_page"`
	SidebarNotifications map[string]int     `json:"sidebarNotifications"`
}
