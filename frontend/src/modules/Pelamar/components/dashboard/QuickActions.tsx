import { Button } from '@/shared/components/ui/button';

interface QuickAction {
    label: string;
    onClick: () => void;
}

interface QuickActionsProps {
    actions: QuickAction[];
}

export default function QuickActions({ actions }: QuickActionsProps) {
    return (
        <div>
            <h3 className="mb-4 text-lg font-semibold text-blue-900">
                Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {actions.map((action) => (
                    <Button
                        key={action.label}
                        onClick={action.onClick}
                        className="bg-blue-900 hover:bg-blue-800"
                    >
                        {action.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}


