export type ReplyHistoryEntry = {
  id: number | null;
  note: string;
  author?: string | null;
  division?: string | null;
  toDivision?: string | null;
  timestamp?: string | null;
  attachment?: {
    name?: string | null;
    size?: string | number | null;
    url?: string | null;
  } | null;
};

export interface LetterRecord {
  id: number;
  letterNumber: string;
  from: string;
  sender: string;
  subject: string;
  category: string;
  date: string;
  receivedAt?: string | null;
  status: string;
  priority: string;
  hasAttachment: boolean;
  attachmentUrl?: string | null;
  content?: string | null;
  dispositionNote?: string | null;
  replyNote?: string | null;
  replyBy?: string | null;
  replyAt?: string | null;
  canReply?: boolean;
  replyHistory?: ReplyHistoryEntry[];
  targetDivision?: string | null;
  recipient?: string | null;
  currentRecipient?: string | null;
  disposedBy?: string | null;
  disposedAt?: string | null;
  approvalDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  isFinalized?: boolean;
  dispositionDocumentUrl?: string | null;
  dispositionDocumentName?: string | null;
}

export type TabValue = 'inbox' | 'outbox' | 'archive';

export type TrackingStep = {
  id: string;
  status: string;
  description: string;
  location?: string | null;
  timestamp?: string | null;
  person?: string | null;
  completed: boolean;
};
