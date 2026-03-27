// Legacy typography file - now imports from centralized theme
// This file is kept for backward compatibility
import { theme } from './theme';

export const typography = {
  h1: theme.typography.h1,
  h2: theme.typography.h2,
  h3: theme.typography.h3,
  h4: theme.typography.h4,
  h5: theme.typography.h5,
  h6: theme.typography.h6,
  body: theme.typography.body1,
  body1: theme.typography.body1,
  body2: theme.typography.body2,
  caption: theme.typography.caption,
  small: theme.typography.caption,
  button: theme.typography.button,
};
