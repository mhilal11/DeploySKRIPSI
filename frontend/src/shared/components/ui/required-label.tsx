import { Fragment } from 'react';

interface RequiredLabelProps {
    text: string;
    required?: boolean;
}

export function RequiredLabel({
    text,
    required = true,
}: RequiredLabelProps) {
    return (
        <Fragment>
            {text}
            {required && <span className="text-red-500"> *</span>}
        </Fragment>
    );
}
