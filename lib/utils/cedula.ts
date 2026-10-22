/**
 * Cédula ecuatoriana: 10 dígitos, provincia 01–24 o 30, tercer dígito menor
 * a 6 y dígito verificador por módulo 10. Misma regla que
 * utils/cedula.ts del backend; única copia del cliente.
 */
export function isValidCedulaEcuatoriana(value: string): boolean {
  if (!/^[0-9]{10}$/.test(value)) return false;
  const province = Number(value.slice(0, 2));
  if (((province < 1 || province > 24) && province !== 30) || Number(value[2]) >= 6) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(value[i]) * (i % 2 === 0 ? 2 : 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return (10 - (sum % 10)) % 10 === Number(value[9]);
}
