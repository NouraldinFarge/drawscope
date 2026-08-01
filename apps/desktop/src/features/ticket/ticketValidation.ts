export type ValidPowerballTicket = {
  mainNumbers: number[];
  specialNumber: number;
};

export type TicketValidation =
  | { valid: true; ticket: ValidPowerballTicket }
  | { valid: false; message: string; invalidIndices: number[] };

export function validatePowerballTicket(values: string[]): TicketValidation {
  const malformedIndices = Array.from({ length: 6 }, (_, index) => index).filter(
    (index) => !/^\d{1,2}$/.test(values[index] ?? ""),
  );
  if (values.length !== 6 || malformedIndices.length > 0) {
    return {
      valid: false,
      message: "Enter five white-ball numbers and one Powerball using whole numbers only.",
      invalidIndices: malformedIndices.length > 0 ? malformedIndices : [0, 1, 2, 3, 4, 5],
    };
  }
  const parsed = values.map(Number);
  const mainNumbers = parsed.slice(0, 5);
  const specialNumber = parsed[5];
  const invalidIndices = mainNumbers.flatMap((value, index) => {
    const isDuplicate = mainNumbers.filter((candidate) => candidate === value).length > 1;
    return value < 1 || value > 69 || isDuplicate ? [index] : [];
  });
  if (specialNumber < 1 || specialNumber > 26) {
    invalidIndices.push(5);
  }
  if (invalidIndices.length > 0) {
    return {
      valid: false,
      message: "Choose five distinct white balls from 1–69 and one Powerball from 1–26.",
      invalidIndices,
    };
  }
  return { valid: true, ticket: { mainNumbers, specialNumber } };
}
