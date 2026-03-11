import { createContext } from 'react';

import { PageContextValue } from './inertia-types';

export const PageContext = createContext<PageContextValue | null>(null);
