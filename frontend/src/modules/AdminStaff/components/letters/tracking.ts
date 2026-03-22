import { LetterRecord, TrackingStep } from './types';

function hasText(value?: string | null): boolean {
  return Boolean(value && value.trim() !== '');
}

function buildReplyHistory(letter: LetterRecord) {
  if (letter.replyHistory && letter.replyHistory.length > 0) {
    return letter.replyHistory;
  }

  if (letter.replyNote) {
    return [
      {
        id: null,
        note: letter.replyNote,
        author: letter.replyBy,
        division: letter.targetDivision ?? letter.recipient ?? letter.from,
        toDivision: letter.recipient ?? letter.targetDivision,
        timestamp: letter.replyAt,
      },
    ];
  }

  return [];
}

function getInitialTargetDivision(letter: LetterRecord, replyHistory: ReturnType<typeof buildReplyHistory>): string {
  const firstReplyDivision = replyHistory[0]?.division;
  if (hasText(firstReplyDivision)) {
    return firstReplyDivision!.trim();
  }
  const currentTarget = letter.targetDivision ?? letter.recipient;
  if (hasText(currentTarget)) {
    return currentTarget!.trim();
  }
  return 'Divisi terkait';
}

export function buildTrackingSteps(letter: LetterRecord): TrackingStep[] {
  const normalizedStatus = (letter.status ?? '').toLowerCase();
  const isArchived = normalizedStatus.includes('arsip');
  const isRejected = normalizedStatus.includes('tolak');
  const isFinalized = Boolean(letter.isFinalized) || normalizedStatus.includes('final');
  const isCompletedStatus = normalizedStatus.includes('selesai');
  const isClosed = normalizedStatus.includes('tutup');
  const replyHistory = buildReplyHistory(letter);
  const firstReply = replyHistory.length > 0 ? replyHistory[0] : null;
  const lastReply = replyHistory.length > 0 ? replyHistory[replyHistory.length - 1] : null;
  const creationTimestamp = letter.createdAt ?? letter.date ?? undefined;
  const initialTargetDivision = getInitialTargetDivision(letter, replyHistory);
  const finalTargetDivision = letter.targetDivision ?? letter.recipient ?? initialTargetDivision;
  const hasProcessProgress =
    replyHistory.length > 0 ||
    Boolean(letter.disposedAt) ||
    hasText(letter.dispositionNote) ||
    Boolean(letter.isFinalized) ||
    isRejected ||
    isArchived ||
    isCompletedStatus ||
    isClosed ||
    letter.currentRecipient === 'division' ||
    letter.currentRecipient === 'archive';

  const steps: TrackingStep[] = [];

  steps.push({
    id: 'created',
    status: 'Dibuat',
    description: `Surat dibuat oleh ${letter.sender ?? 'pengirim tidak diketahui'} dan dikirim ke Admin HC.`,
    location: letter.from ?? 'Internal',
    timestamp: creationTimestamp,
    person: letter.sender,
    completed: true,
  });

  if (hasProcessProgress) {
    steps.push({
      id: 'hr-received',
      status: 'Diterima Admin HC',
      description: 'Admin HC menerima surat dan menyiapkan disposisi ke divisi tujuan.',
      location: 'Human Capital',
      timestamp: letter.approvalDate ?? firstReply?.timestamp ?? letter.disposedAt ?? undefined,
      person: letter.disposedBy,
      completed: true,
    });

    steps.push({
      id: 'to-target-division',
      status: 'Dikirim ke Divisi',
      description: `Surat diteruskan ke divisi ${initialTargetDivision}.`,
      location: initialTargetDivision,
      timestamp: firstReply?.timestamp ?? letter.approvalDate ?? letter.disposedAt ?? undefined,
      person: letter.disposedBy,
      completed: true,
    });
  }

  replyHistory.forEach((entry, index) => {
    steps.push({
      id: `division-reply-${entry.id ?? index}`,
      status: 'Balasan Divisi',
      description: entry.note
        ? `Divisi ${entry.division ?? initialTargetDivision} membalas: ${entry.note}`
        : `Divisi ${entry.division ?? initialTargetDivision} mengirim balasan ke Admin HC.`,
      location: `${entry.division ?? initialTargetDivision} -> Human Capital`,
      timestamp: entry.timestamp ?? letter.replyAt ?? undefined,
      person: entry.author ?? letter.replyBy,
      completed: true,
    });
  });

  if (replyHistory.length > 0 && (isFinalized || isRejected || isArchived || isCompletedStatus || isClosed)) {
    steps.push({
      id: 'hr-after-reply',
      status: 'Ditinjau Ulang Admin HC',
      description: 'Admin HC meninjau balasan divisi untuk menentukan keputusan akhir.',
      location: 'Human Capital',
      timestamp: letter.disposedAt ?? letter.updatedAt ?? undefined,
      person: letter.disposedBy,
      completed: true,
    });
  }

  if (isFinalized || isRejected || isArchived || isCompletedStatus || isClosed) {
    const finalStatus = isFinalized
      ? 'Disposisi Final'
      : isRejected
        ? 'Ditolak HR'
        : isArchived
          ? 'Diarsipkan'
          : letter.status ?? 'Selesai';
    steps.push({
      id: 'final',
      status: finalStatus,
      description: isFinalized
        ? `Surat didisposisi final ke ${finalTargetDivision}.`
        : `Status akhir surat: ${finalStatus}.`,
      location: isArchived ? 'Arsip Sistem' : finalTargetDivision,
      timestamp: letter.disposedAt ?? letter.updatedAt ?? lastReply?.timestamp ?? undefined,
      person: letter.disposedBy ?? letter.replyBy ?? lastReply?.author ?? letter.sender,
      completed: true,
    });
  }

  return steps;
}
