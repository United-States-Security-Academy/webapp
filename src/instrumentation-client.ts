import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './sentry-options';

// No Session Replay integration on purpose: replays record what's on screen, including forms where
// students type government ID numbers.
Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
