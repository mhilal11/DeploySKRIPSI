import React, { ReactNode, useState } from 'react';

import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

import { TerminationRecord } from '../types';

interface TerminationDetailDialogProps {
  termination: TerminationRecord;
  trigger: ReactNode;
  tooltip?: string;
}

export default function TerminationDetailDialog({
  termination,
  trigger,
  tooltip,
}: TerminationDetailDialogProps) {
  const getDisplayProgress = (req: TerminationRecord) => {
    const status = (req.status || '').toLowerCase();
    if (status.includes('diajukan') || status.includes('menunggu') || status.includes('pending')) {
      return 0;
    }
    return Math.max(0, req.progress ?? 0);
  };

  const [open, setOpen] = useState(false);

  const triggerWithOnClick = React.cloneElement(trigger as React.ReactElement, {
    onClick: (e: React.MouseEvent) => {
      setOpen(true);
      (trigger as React.ReactElement).props.onClick?.(e);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {tooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {triggerWithOnClick}
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        triggerWithOnClick
      )}
      <DialogContent className="max-w-3xl h-[85vh] border-0 bg-white p-0 flex flex-col gap-0 overflow-hidden">
        {/* Header tetap, tidak ikut scroll */}
        <DialogHeader className="shrink-0 space-y-1 border-b border-slate-100 bg-white px-8 py-5 text-left">
          <div>
            <DialogTitle className="text-xl font-bold">Detail Pengajuan Offboarding</DialogTitle>
            <DialogDescription className="mt-1.5">
              Informasi lengkap mengenai karyawan dan alasan pengajuan termination.
            </DialogDescription>
          </div>
          <div className="pt-2">
            {renderStatusBadge(termination.status)}
          </div>
        </DialogHeader>

        {/* Isi dialog yang bisa discroll */}
        <ScrollArea className="flex-1 w-full bg-white min-h-0">
          <div className="px-8 pb-8 pt-6 text-sm flex flex-col gap-8">

            {/* Informasi Utama */}
            <section className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Informasi Karyawan
              </h4>
              <div className="grid grid-cols-2 gap-y-5 gap-x-8 rounded-xl border border-slate-300 bg-slate-50 p-5 shadow-sm">
                <Detail label="ID Pengajuan" value={termination.reference} />
                <Detail label="ID Karyawan" value={termination.employeeCode} />
                <Detail label="Nama Karyawan" value={termination.employeeName} />
                <Detail label="Divisi" value={termination.division} />
                <Detail label="Posisi" value={termination.position} />
                <Detail label="Tipe Offboarding" value={termination.type} />
                <Detail label="Tanggal Pengajuan" value={termination.requestDate} />
                <Detail label="Tanggal Efektif" value={termination.effectiveDate} />
              </div>
            </section>

            <Separator />

            {/* Progress Bar */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-foreground">Status Progress</h4>
                <span className="text-sm font-medium text-muted-foreground">{getDisplayProgress(termination)}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-2.5 rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${getDisplayProgress(termination)}%` }}
                />
              </div>
            </section>

            <Separator />

            {/* Detail Alasan & Catatan */}
            <div className="grid grid-cols-1 gap-8">
              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Alasan Pengajuan
                </h4>
                <div className="rounded-lg bg-slate-50 p-4 text-slate-900 leading-relaxed text-sm border border-slate-300 shadow-sm">
                  {termination.reason || <span className="text-muted-foreground italic">Tidak ada alasan yang dicantumkan.</span>}
                </div>
              </section>

              {termination.suggestion && (
                <section className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    Saran / Masukan
                  </h4>
                  <div className="rounded-lg bg-slate-50 p-4 text-slate-900 leading-relaxed text-sm border border-slate-300 shadow-sm">
                    {termination.suggestion}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Catatan HR
                </h4>
                <div className="rounded-lg bg-amber-50 p-4 text-slate-900 leading-relaxed text-sm border border-amber-200 shadow-sm">
                  {termination.notes || <span className="text-muted-foreground italic">Belum ada catatan dari HR.</span>}
                </div>
              </section>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog >
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className='space-y-1'>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">
        {value ?? '-'}
      </p>
    </div>
  );
}

function renderStatusBadge(status: string) {
  switch (status) {
    case 'Diajukan':
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">
          Diajukan
        </Badge>
      );
    case 'Proses':
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50">
          Proses
        </Badge>
      );
    case 'Selesai':
      return (
        <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">
          Selesai
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}


