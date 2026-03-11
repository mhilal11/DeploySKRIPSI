import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

interface FormSelectProps {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    options: Array<{ value: string; label: string }>;
}

export function FormSelect({
    label,
    placeholder,
    value,
    options,
    onChange,
    error,
}: FormSelectProps) {
    return (
        <div>
            <Label>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

interface FormFieldProps {
    label: string;
    value: string;
    placeholder: string;
    error?: string;
    onChange: (value: string) => void;
}

export function FormField({ label, value, placeholder, error, onChange }: FormFieldProps) {
    return (
        <div>
            <Label>{label}</Label>
            <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

interface FormTextareaProps extends Omit<FormFieldProps, 'onChange'> {
    onChange: (value: string) => void;
}

export function FormTextarea({ label, value, placeholder, error, onChange }: FormTextareaProps) {
    return (
        <div>
            <Label>{label}</Label>
            <Textarea
                rows={6}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}
