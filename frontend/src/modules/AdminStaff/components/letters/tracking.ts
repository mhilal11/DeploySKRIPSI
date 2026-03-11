import { LetterRecord, TrackingStep } from './types';

export function buildTrackingSteps(letter: LetterRecord): TrackingStep[] {
  const normalizedStatus = (letter.status ?? '').toLowerCase();
  const isArchived = normalizedStatus.includes('arsip');
  const isRejected = normalizedStatus.includes('tolak');
  const isCompletedStatus = normalizedStatus.includes('selesai');
  const isClosed = normalizedStatus.includes('tutup');
  const hrPendingKeywords = ['menunggu hr', 'diajukan', 'diproses', 'terkirim'];
  const waitingHr = hrPendingKeywords.some((keyword) => normalizedStatus.includes(keyword));

  const replyHistory =
    letter.replyHistory && letter.replyHistory.length > 0
      ? letter.replyHistory
      : letter.replyNote
        ? [
          {
            id: null,
            note: letter.replyNote,
            author: letter.replyBy,
            division: letter.targetDivision ?? letter.recipient ?? letter.from,
            toDivision: letter.recipient ?? letter.targetDivision,
            timestamp: letter.replyAt,
          },
        ]
        : [];
  const lastReply = replyHistory[replyHistory.length - 1];
  const replyCompleted = replyHistory.length > 0;

  const creationTimestamp = letter.createdAt ?? letter.date ?? null;
  const steps: TrackingStep[] = [
    {
      id: 'created',
      status: 'Dibuat',
      description: `Surat dibuat oleh ${letter.sender ?? 'pengirim tidak diketahui'}.`,
      location: letter.from ?? 'Internal',
      timestamp: creationTimestamp,
      person: letter.sender,
      completed: Boolean(creationTimestamp),
    },
    {
      id: 'hr',
      status: 'Ditinjau HR',
      description: letter.dispositionNote
        ? 'HR telah memberikan disposisi dan catatan.'
        : 'Surat menunggu peninjauan HR.',
      location: 'Human Capital',
      timestamp: letter.disposedAt ?? letter.approvalDate,
      person: letter.disposedBy,
      completed:
        !waitingHr ||
        Boolean(letter.disposedAt || letter.dispositionNote) ||
        isArchived ||
        isRejected ||
        isCompletedStatus,
    },
    {
      id: 'division',
      status: 'Dikirim ke Divisi',
      description: letter.targetDivision
        ? `Surat diteruskan ke divisi ${letter.targetDivision}.`
        : 'Divisi tujuan belum ditentukan.',
      location: letter.targetDivision ?? letter.recipient ?? 'Divisi terkait',
      timestamp: letter.disposedAt,
      person: letter.disposedBy,
      completed:
        letter.currentRecipient === 'division' ||
        letter.currentRecipient === 'archive' ||
        replyCompleted ||
        isArchived ||
        isCompletedStatus ||
        isRejected,
    },
    {
      id: 'follow-up',
      status: 'Tindak Lanjut Divisi',
      description: replyCompleted
        ? `Balasan terbaru: ${lastReply?.note ?? 'Divisi telah memberikan catatan.'}`
        : 'Menunggu tindak lanjut dari divisi.',
      location: letter.targetDivision ?? letter.recipient ?? 'Divisi terkait',
      timestamp: lastReply?.timestamp ?? letter.replyAt,
      person: lastReply?.author ?? letter.replyBy,
      completed: replyCompleted,
    },
    {
      id: 'final',
      status: letter.status ?? 'Status Berjalan',
      description: `Status saat ini: ${letter.status ?? 'Tidak diketahui'}.`,
      location:
        letter.currentRecipient === 'hr'
          ? 'Human Capital'
          : letter.currentRecipient === 'division'
            ? letter.targetDivision ?? letter.recipient ?? 'Divisi terkait'
            : letter.currentRecipient === 'archive'
              ? 'Arsip Sistem'
              : letter.targetDivision ?? letter.recipient ?? '-',
      timestamp:
        letter.updatedAt ??
        lastReply?.timestamp ??
        letter.replyAt ??
        letter.disposedAt ??
        creationTimestamp,
      person: lastReply?.author ?? letter.replyBy ?? letter.disposedBy ?? letter.sender,
      completed:
        isArchived ||
        isRejected ||
        isCompletedStatus ||
        isClosed ||
        letter.currentRecipient === 'archive',
    },
  ];

  return steps;
}
