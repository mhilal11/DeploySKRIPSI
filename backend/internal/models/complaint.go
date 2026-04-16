package models

import complaintmodel "hris-backend/internal/models/complaint"

type Complaint = complaintmodel.Complaint
type ComplaintAttachment = complaintmodel.ComplaintAttachment

const (
	ComplaintStatusNew        = complaintmodel.ComplaintStatusNew
	ComplaintStatusInProgress = complaintmodel.ComplaintStatusInProgress
	ComplaintStatusResolved   = complaintmodel.ComplaintStatusResolved
	ComplaintStatusArchived   = complaintmodel.ComplaintStatusArchived
)

var ComplaintStatusLabels = complaintmodel.ComplaintStatusLabels

const (
	ComplaintPriorityHigh   = complaintmodel.ComplaintPriorityHigh
	ComplaintPriorityMedium = complaintmodel.ComplaintPriorityMedium
	ComplaintPriorityLow    = complaintmodel.ComplaintPriorityLow
)

var ComplaintPriorityLabels = complaintmodel.ComplaintPriorityLabels
