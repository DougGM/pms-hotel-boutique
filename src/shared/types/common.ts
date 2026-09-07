export type Currency = 'GTQ' | 'USD' | 'MXN' | 'EUR';

const DATE_ONLY_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

export const toDomainDate = (value: string): Date => {
  const match = DATE_ONLY_PATTERN.exec(value);

  if (match) {
    const [, day, month, year] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));

    if (
      parsed.getFullYear() !== Number(year) ||
      parsed.getMonth() !== Number(month) - 1 ||
      parsed.getDate() !== Number(day)
    ) {
      throw new Error(`Invalid date: ${value}`);
    }

    return parsed;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return parsed;
};

export const toDtoDate = (value: Date): string => {
  if (Number.isNaN(value.getTime())) {
    throw new Error('Cannot serialize an invalid date');
  }

  return value.toISOString();
};
