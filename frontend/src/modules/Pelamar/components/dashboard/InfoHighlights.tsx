import { Card } from '@/shared/components/ui/card';

interface InfoHighlight {
    message: string;
    tone: 'warning' | 'info' | 'success';
}

interface InfoHighlightsProps {
    highlights: InfoHighlight[];
}

const toneStyles: Record<
    InfoHighlight['tone'],
    { wrapper: string; text: string }
> = {
    warning: {
        wrapper: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-900',
    },
    info: {
        wrapper: 'bg-blue-50 border-blue-200',
        text: 'text-blue-900',
    },
    success: {
        wrapper: 'bg-green-50 border-green-200',
        text: 'text-green-900',
    },
};

export default function InfoHighlights({ highlights }: InfoHighlightsProps) {
    return (
        <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-blue-900">
                Informasi Penting
            </h3>
            <div className="space-y-3">
                {highlights.map((highlight, index) => {
                    const style = toneStyles[highlight.tone];
                    return (
                        <div
                            key={`${highlight.message}-${index}`}
                            className={`rounded-lg border p-4 ${style.wrapper}`}
                        >
                            <p className={style.text}>{highlight.message}</p>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}


