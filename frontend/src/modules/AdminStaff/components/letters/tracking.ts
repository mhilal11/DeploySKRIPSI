import { LetterRecord, TrackingStep } from './types';

function hasText(value?: string | null): boolean {
  return Boolean(value && value.trim() !== '');
}

export function buildTrackingSteps(letter: LetterRecord): TrackingStep[] {
  const normalizedStatus = (letter.status ?? '').toLowerCase();
  const isArchived = normalizedStatus.includes('arsip');
  const isRejected = normalizedStatus.includes('tolak');
  const isFinalized = Boolean(letter.isFinalized) || normalizedStatus.includes('final');
  const isCompletedStatus = normalizedStatus.includes('selesai');
  const isClosed = normalizedStatus.includes('tutup');

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
  const lastReply = replyHistory.length > 0 ? replyHistory[replyHistory.length - 1] : null;

  const creationTimestamp = letter.createdAt ?? letter.date ?? null;

  const hrReviewed =
    Boolean(letter.disposedAt) ||
    hasText(letter.dispositionNote) ||
    letter.currentRecipient === 'division' ||
    letter.currentRecipient === 'archive' ||
    replyHistory.length > 0 ||
    isArchived ||
    isRejected ||
    isFinalized ||
    isCompletedStatus ||
    isClosed;

  const sentToDivision =
    letter.currentRecipient === 'division' ||
    letter.currentRecipient === 'archive' ||
    replyHistory.length > 0 ||
    isArchived ||
    isRejected ||
    isFinalized ||
    isCompletedStatus ||
    isClosed;

  const isFinalStepReached =
    isArchived ||
    isRejected ||
    isFinalized ||
    isCompletedStatus ||
    isClosed ||
    letter.currentRecipient === 'archive';

  const steps: TrackingStep[] = [];

  if (creationTimestamp) {
    steps.push({
      id: 'created',
      status: 'Dibuat',
      description: `Surat dibuat oleh ${letter.sender ?? 'pengirim tidak diketahui'}.`,
      location: letter.from ?? 'Internal',
      timestamp: creationTimestamp,
      person: letter.sender,
      completed: true,
    });
  }

  if (hrReviewed) {
    steps.push({
      id: 'hr',
      status: 'Ditinjau HR',
      description: hasText(letter.dispositionNote)
        ? 'HR telah memberikan disposisi dan catatan.'
        : 'Surat telah melalui proses peninjauan HR.',
      location: 'Human Capital',
      timestamp: letter.disposedAt ?? letter.approvalDate ?? undefined,
      person: letter.disposedBy,
      completed: true,
    });
  }

  if (sentToDivision) {
    steps.push({
      id: 'division',
      status: 'Dikirim ke Divisi',
      description: letter.targetDivision
        ? `Surat diteruskan ke divisi ${letter.targetDivision}.`
        : 'Surat diteruskan ke divisi terkait.',
      location: letter.targetDivision ?? letter.recipient ?? 'Divisi terkait',
      timestamp: letter.disposedAt ?? letter.approvalDate ?? undefined,
      person: letter.disposedBy,
      completed: true,
    });
  }

  replyHistory.forEach((entry, index) => {
    steps.push({
      id: `follow-up-${entry.id ?? index}`,
      status: 'Tindak Lanjut Divisi',
      description: entry.note
        ? `Balasan divisi: ${entry.note}`
        : 'Divisi telah memberikan tindak lanjut.',
      location: entry.division ?? letter.targetDivision ?? letter.recipient ?? 'Divisi terkait',
      timestamp: entry.timestamp ?? letter.replyAt ?? undefined,
      person: entry.author ?? letter.replyBy,
      completed: true,
    });
  });

  if (isFinalStepReached) {
    const finalStatus = isArchived
      ? 'Diarsipkan'
      : isRejected
        ? letter.status ?? 'Ditolak HR'
        : isFinalized
          ? 'Disposisi Final'
          : letter.status ?? 'Selesai';

    steps.push({
      id: 'final',
      status: finalStatus,
      description: `Status saat ini: ${finalStatus}.`,
      location:
        letter.currentRecipient === 'archive'
          ? 'Arsip Sistem'
          : letter.currentRecipient === 'division'
            ? letter.targetDivision ?? letter.recipient ?? 'Divisi terkait'
            : letter.currentRecipient === 'hr'
              ? 'Human Capital'
              : letter.targetDivision ?? letter.recipient ?? '-',
      timestamp:
        letter.updatedAt ??
        lastReply?.timestamp ??
        letter.replyAt ??
        letter.disposedAt ??
        creationTimestamp ??
        undefined,
      person: lastReply?.author ?? letter.replyBy ?? letter.disposedBy ?? letter.sender,
      completed: true,
    });
  }

  return steps;
}
