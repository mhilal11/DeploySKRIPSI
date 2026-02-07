import { CheckCircle, Clock } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';


export interface ApplicationStage {
    name: string;
    status: 'completed' | 'current' | 'pending';
    date: string;
}

interface ApplicationStatusCardProps {
    progress: number;
    stages: ApplicationStage[];
    rejectionReason?: string | null;
}

export default function ApplicationStatusCard({
    progress,
    stages,
    rejectionReason,
}: ApplicationStatusCardProps) {
    const currentStageName =
        stages.find((stage) => stage.status === 'current')?.name || null;

    const visibleStages = stages.filter((stage) => {
        if (currentStageName === 'Rejected') {
            return stage.name !== 'Hired';
        }
        if (currentStageName === 'Hired') {
            return stage.name !== 'Rejected';
        }
        return true;
    });

    return (
        <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-blue-900">
                Status Lamaran Anda
            </h3>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Progress:</span>
                    <span className="font-semibold text-blue-900">
                        {progress}%
                    </span>
                </div>
                <Progress value={progress} className="h-3" />
            </div>

            {/* Rejection Reason */}
            {rejectionReason && (
                <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4">
                    <h4 className="mb-1 font-semibold text-red-700">
                        Lamaran Ditolak
                    </h4>
                    <p className="text-sm text-red-600">
                        Alasan: {rejectionReason}
                    </p>
                </div>
            )}

            {/* If no stages */}
            {visibleStages.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    Belum ada lamaran yang dikirim. Ajukan lamaran untuk melihat
                    perkembangan proses rekrutmen Anda.
                </p>
            ) : (
                <div className="space-y-4">
                    {visibleStages.map((stage) => {
                        const isRejected = stage.name === 'Rejected';

                        return (
                            <div
                                key={stage.name}
                                className="flex items-center gap-4"
                            >
                                {/* Stage Icon */}
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                        stage.status === 'completed'
                                            ? 'bg-green-500'
                                            : stage.status === 'current'
                                            ? isRejected
                                                ? 'bg-red-500'
                                                : 'bg-blue-500'
                                            : 'bg-slate-200'
                                    }`}
                                >
                                    {stage.status === 'completed' ? (
                                        <CheckCircle className="h-6 w-6 text-white" />
                                    ) : stage.status === 'current' ? (
                                        isRejected ? (
                                            <CheckCircle className="h-6 w-6 text-white" />
                                        ) : (
                                            <Clock className="h-6 w-6 text-white" />
                                        )
                                    ) : (
                                        <div className="h-3 w-3 rounded-full bg-white" />
                                    )}
                                </div>

                                {/* Stage Text */}
                                <div className="flex-1">
                                    <p
                                        className={`text-sm font-medium ${
                                            stage.status === 'current'
                                                ? isRejected
                                                    ? 'text-red-600'
                                                    : 'text-blue-900'
                                                : 'text-slate-700'
                                        }`}
                                    >
                                        {stage.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                         {stage.date}
                                    </p>
                                </div>

                                {/* Badges */}
                                {stage.status === 'current' &&
                                    stage.name === 'Rejected' && (
                                        <Badge className="bg-red-500 text-white">
                                            Ditolak
                                        </Badge>
                                    )}

                                {stage.status === 'current' &&
                                    stage.name !== 'Rejected' && (
                                        <Badge className="bg-blue-500 text-white">
                                            Tahap Saat Ini
                                        </Badge>
                                    )}

                                {stage.status === 'completed' &&
                                    stage.name !== 'Rejected' && (
                                        <Badge
                                            variant="outline"
                                            className="border-green-500 text-green-500"
                                        >
                                            Selesai
                                        </Badge>
                                    )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}


