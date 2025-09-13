export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

export const formatGPA = (gpa: number): string => {
  if (!gpa || isNaN(gpa)) return 'N/A';
  return gpa.toFixed(2);
};

export const formatSATScore = (score: number): string => {
  if (!score || isNaN(score)) return 'N/A';
  return score.toString();
};

export const formatPercentage = (value: number): string => {
  if (!value || isNaN(value)) return 'N/A';
  return `${value.toFixed(1)}%`;
};

export const formatCurrency = (amount: number): string => {
  if (!amount || isNaN(amount)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatSATRange = (range: string): { low: number; high: number } | null => {
  if (!range) return null;
  
  const match = range.match(/(\d+)-(\d+)/);
  if (match) {
    return {
      low: parseInt(match[1]),
      high: parseInt(match[2])
    };
  }
  
  return null;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// frontend/src/utils/validators.ts
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
