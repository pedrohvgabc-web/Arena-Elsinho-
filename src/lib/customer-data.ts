export function normalizeValidCpf(input: string): string | null {
  const cpf = input.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return null;

  const checkDigit = (digits: string, firstWeight: number) => {
    const sum = [...digits].reduce(
      (total, digit, index) => total + Number(digit) * (firstWeight - index),
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = checkDigit(cpf.slice(0, 9), 10);
  const second = checkDigit(cpf.slice(0, 10), 11);
  if (first !== Number(cpf[9]) || second !== Number(cpf[10])) return null;
  return cpf;
}

export function formatCpfInput(input: string) {
  const cpf = input.replace(/\D/g, "").slice(0, 11);
  if (cpf.length <= 3) return cpf;
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}
