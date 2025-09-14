export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateGPA = (gpa: number): boolean => {
  return gpa >= 0 && gpa <= 4.0;
};

export const validateSAT = (sat: number): boolean => {
  return sat >= 400 && sat <= 1600;
};

export const validateACT = (act: number): boolean => {
  return act >= 1 && act <= 36;
};

export const validateRequired = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};