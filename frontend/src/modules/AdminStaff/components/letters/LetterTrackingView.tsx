import { CheckCircle, Circle, Clock, MapPin } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '@/shared/components/ui/badge';

import { buildTrackingSteps } from './tracking';
import { LetterRecord } from './types';

export function LetterTrackingView({ letter }: { letter: LetterRecord }) {
  const steps = useMemo(() => buildTrackingSteps(letter), [letter]);

  if (!steps.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">
        Riwayat tracking belum tersedia untuk surat ini.
      </div>
    );
  }

  const firstIncomplete = steps.findIndex((step) => !step.completed);
  const currentStepIndex = firstIncomplete === -1 ? Math.max(0, steps.length - 1) : firstIncomplete;
  const currentStatus = steps[currentStepIndex]?.status ?? 'Status Tidak Diketahui';
  const totalSteps = steps.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-900">Tracking Surat</p>
          <p className="text-xs text-slate-500">
            ID {letter.letterNumber ?? letter.id} Tujuan{' '}
            {letter.targetDivision ?? letter.recipient ?? 'Tidak ditentukan'}
          </p>
        </div>
        <Badge className="bg-blue-900 text-white">{currentStatus}</Badge>
      </div>

      <div className="relative space-y-8">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isCurrent = index === currentStepIndex && !step.completed;
          return (
            <div key={step.id} className="relative flex gap-4">
              {!isLast && (
                <div
                  className={`absolute left-4 top-8 h-full w-0.5 ${
                    step.completed ? 'bg-blue-900' : 'bg-slate-300'
                  }`}
                />
              )}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    step.completed
                      ? 'bg-blue-900 text-white'
                      : isCurrent
                        ? 'animate-pulse bg-amber-500 text-white'
                        : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : isCurrent ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
              </div>
              <div className="flex-1 pb-8">
                <div
                  className={`rounded-xl border-2 p-4 ${
                    step.completed
                      ? 'border-blue-200 bg-blue-50'
                      : isCurrent
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          step.completed || isCurrent ? 'text-blue-900' : 'text-slate-600'
                        }`}
                      >
                        {step.status}
                      </p>
                      {step.person && <p className="text-xs text-slate-500">oleh {step.person}</p>}
                    </div>
                    {step.timestamp && <p className="text-xs text-slate-500">{step.timestamp}</p>}
                  </div>
                  {step.description && (
                    <p className="mt-3 text-sm text-slate-700">{step.description}</p>
                  )}
                  {step.location && (
                    <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{step.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-slate-500">Total Langkah</p>
        <p className="text-lg font-semibold text-blue-900">{totalSteps}</p>
      </div>
    </div>
  );
}
