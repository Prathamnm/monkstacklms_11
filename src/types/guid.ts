/**
 * Represents a GUID string.
 * This is used to distinguish IDs from regular strings in the type system.
 */
export type Guid = string & { readonly _brand: 'Guid' };
