// Compatibility facade for repository tooling that previously imported the
// Draft 1 semantic validator from scripts/. New consumers should import the
// public package directly.

import { validateMcpDescription } from '@mcpdesc/validator';
import {
  semanticValidateDocument,
  supportedProtocolVersions
} from '../packages/validator/src/internal.js';

export { semanticValidateDocument, supportedProtocolVersions };

export function validateMcpdesc08Document(document) {
  return validateMcpDescription(document, {
    specification: '0.8.0-draft.1'
  }).diagnostics;
}
