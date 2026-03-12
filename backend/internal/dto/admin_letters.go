package dto

type LetterReplyHistory struct {
	ID         int64   `json:"id"`
	Note       string  `json:"note"`
	Author     string  `json:"author"`
	Division   *string `json:"division"`
	ToDivision *string `json:"toDivision"`
	Timestamp  string  `json:"timestamp"`
}

type LetterAttachment struct {
	Name string  `json:"name"`
	Size any     `json:"size"`
	URL  *string `json:"url"`
}

type AdminLetter struct {
	ID                      int64                `json:"id"`
	LetterNumber            string               `json:"letterNumber"`
	From                    string               `json:"from"`
	Sender                  string               `json:"sender"`
	SenderName              string               `json:"senderName"`
	SenderDivision          string               `json:"senderDivision"`
	RecipientName           string               `json:"recipientName"`
	LetterType              string               `json:"letterType"`
	Subject                 string               `json:"subject"`
	Category                string               `json:"category"`
	Date                    string               `json:"date"`
	Status                  string               `json:"status"`
	IsFinalized             bool                 `json:"isFinalized"`
	Priority                string               `json:"priority"`
	HasAttachment           bool                 `json:"hasAttachment"`
	AttachmentURL           *string              `json:"attachmentUrl"`
	Attachment              *LetterAttachment    `json:"attachment"`
	Content                 string               `json:"content"`
	DispositionNote         *string              `json:"dispositionNote"`
	ReplyNote               *string              `json:"replyNote"`
	ReplyBy                 string               `json:"replyBy"`
	ReplyAt                 string               `json:"replyAt"`
	ReplyHistory            []LetterReplyHistory `json:"replyHistory"`
	CanReply                bool                 `json:"canReply"`
	TargetDivision          string               `json:"targetDivision"`
	Recipient               string               `json:"recipient"`
	CurrentRecipient        string               `json:"currentRecipient"`
	DisposedBy              string               `json:"disposedBy"`
	DisposedAt              string               `json:"disposedAt"`
	ApprovalDate            string               `json:"approvalDate"`
	CreatedAt               string               `json:"createdAt"`
	UpdatedAt               string               `json:"updatedAt"`
	DispositionDocumentURL  *string              `json:"dispositionDocumentUrl"`
	DispositionDocumentName *string              `json:"dispositionDocumentName"`
}

type RecruitmentSummary struct {
	Name      string  `json:"name"`
	Position  string  `json:"position"`
	Date      string  `json:"date"`
	Status    string  `json:"status"`
	Education *string `json:"education"`
}
