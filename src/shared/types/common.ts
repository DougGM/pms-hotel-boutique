export type Currency = 'USD' | 'MXN' | 'EUR';

export const toDomainDate = (value: string): Date => new Date(value);

export const toDtoDate = (value: Date): string => value.toISOString();
