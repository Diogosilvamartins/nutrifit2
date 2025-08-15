/**
 * Validate Brazilian CPF
 */
export function validateCPF(cpf: string): boolean {
  // Remove all non-digit characters
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Check if CPF has 11 digits
  if (cleanCPF.length !== 11) return false;
  
  // Check for invalid sequences (all same digits)
  const invalidSequences = [
    '00000000000', '11111111111', '22222222222', '33333333333',
    '44444444444', '55555555555', '66666666666', '77777777777',
    '88888888888', '99999999999'
  ];
  
  if (invalidSequences.includes(cleanCPF)) return false;
  
  // Calculate first verification digit
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum1 % 11);
  if (digit1 >= 10) digit1 = 0;
  
  // Calculate second verification digit
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum2 % 11);
  if (digit2 >= 10) digit2 = 0;
  
  // Check if calculated digits match the provided ones
  return (
    digit1 === parseInt(cleanCPF.charAt(9)) &&
    digit2 === parseInt(cleanCPF.charAt(10))
  );
}

/**
 * Format CPF with dots and dash
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return cpf;
  
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Format phone number
 */
export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

/**
 * Format CEP with dash
 */
export function formatCEP(cep: string): string {
  const cleanCEP = cep.replace(/\D/g, '');
  
  if (cleanCEP.length === 8) {
    return cleanCEP.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  
  return cep;
}

/**
 * Validate CEP format
 */
export function validateCEP(cep: string): boolean {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
}