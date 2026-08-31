import { Validator } from '@cfworker/json-schema';
import { validatorsByDescription } from '#standalone-validators';
import validateDraft7Schema from '#standalone-meta-draft7';
import validateDraft2020Schema from '#standalone-meta-draft2020';

function pointerToInstancePath(pointer) {
  return pointer === '#' ? '' : pointer.slice(1);
}

function quotedProperty(message) {
  return /"([^"]+)"/.exec(message)?.[1];
}

function toAjvError(error) {
  const params = {};
  if (error.keyword === 'required') params.missingProperty = quotedProperty(error.error);
  if (error.keyword === 'additionalProperties') params.additionalProperty = quotedProperty(error.error);
  return {
    instancePath: pointerToInstancePath(error.instanceLocation),
    keyword: error.keyword,
    params,
    message: error.error
  };
}

function assertLocalReferencesResolve(schema) {
  const anchors = new Set();
  const references = [];

  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.$anchor === 'string') anchors.add(value.$anchor);
    if (typeof value.$dynamicAnchor === 'string') anchors.add(value.$dynamicAnchor);
    for (const keyword of ['$ref', '$dynamicRef', '$recursiveRef']) {
      if (typeof value[keyword] === 'string') references.push(value[keyword]);
    }
    for (const child of Object.values(value)) visit(child);
  }

  visit(schema);
  for (const reference of references) {
    if (!reference.startsWith('#')) throw new Error(`can't resolve reference ${reference}`);
    if (reference === '#' || reference === '#recursive') continue;
    if (!reference.startsWith('#/')) {
      if (!anchors.has(reference.slice(1))) throw new Error(`can't resolve reference ${reference}`);
      continue;
    }
    let target = schema;
    for (const segment of reference.slice(2).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))) {
      if (!target || typeof target !== 'object' || !Object.hasOwn(target, segment)) {
        throw new Error(`can't resolve reference ${reference}`);
      }
      target = target[segment];
    }
  }
}

function compileSchema(schema, draft) {
  assertLocalReferencesResolve(schema);
  const validator = new Validator(schema, draft, false);
  const validate = (value) => {
    const result = validator.validate(value);
    validate.errors = result.valid ? null : result.errors.map(toAjvError);
    return result.valid;
  };
  validate.errors = null;
  return validate;
}

class AjvAdapter {
  constructor(_options = {}) {
    this.errors = null;
  }

  compile(schema) {
    const standalone = validatorsByDescription.get(schema?.description);
    if (standalone) return standalone;
    return compileSchema(schema, this.constructor.draft);
  }

  validateSchema(schema) {
    const validate = this.constructor.draft === '7' ? validateDraft7Schema : validateDraft2020Schema;
    const valid = validate(schema);
    this.errors = validate.errors;
    return valid;
  }
}

export class AjvDraft7Adapter extends AjvAdapter {
  static draft = '7';
}

export class Ajv2020Adapter extends AjvAdapter {
  static draft = '2020-12';
}

export default AjvDraft7Adapter;