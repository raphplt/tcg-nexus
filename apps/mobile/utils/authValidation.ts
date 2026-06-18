const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PSEUDO_REGEX = /^[a-zA-Z0-9_]{3,24}$/;

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  pseudo: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface AuthFieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  pseudo?: string;
  form?: string;
}

const hasLowerCase = (value: string): boolean => /[a-z]/.test(value);
const hasUpperCase = (value: string): boolean => /[A-Z]/.test(value);
const hasDigit = (value: string): boolean => /\d/.test(value);
const hasSymbol = (value: string): boolean => /[^A-Za-z0-9]/.test(value);

const getPasswordStrengthScore = (password: string): number => {
  let score = 0;

  if (hasLowerCase(password)) score += 1;
  if (hasUpperCase(password)) score += 1;
  if (hasDigit(password)) score += 1;
  if (hasSymbol(password)) score += 1;

  return score;
};

export const getPasswordStrengthLabel = (password: string): string => {
  if (password.length < 6) {
    return "trop court";
  }

  const score = getPasswordStrengthScore(password);
  if (score <= 1) {
    return "faible";
  }

  if (score <= 2) {
    return "moyen";
  }

  return "fort";
};

export const validateLoginForm = (values: LoginFormValues): AuthFieldErrors => {
  const errors: AuthFieldErrors = {};

  if (!values.email.trim()) {
    errors.email = "L'email est requis.";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Format d'email invalide.";
  }

  if (!values.password) {
    errors.password = "Le mot de passe est requis.";
  } else if (values.password.length < 6) {
    errors.password = "Le mot de passe doit contenir au moins 6 caracteres.";
  }

  return errors;
};

export const validateForgotPasswordForm = (
  values: ForgotPasswordFormValues,
): AuthFieldErrors => {
  const errors: AuthFieldErrors = {};

  if (!values.email.trim()) {
    errors.email = "L'email est requis.";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Format d'email invalide.";
  }

  return errors;
};

export const validateRegisterForm = (
  values: RegisterFormValues,
): AuthFieldErrors => {
  const errors: AuthFieldErrors = {};

  if (!values.pseudo.trim()) {
    errors.pseudo = "Le pseudo est requis.";
  } else if (!PSEUDO_REGEX.test(values.pseudo.trim())) {
    errors.pseudo =
      "Pseudo invalide: 3-24 caracteres, lettres/chiffres/underscore.";
  }

  if (!values.email.trim()) {
    errors.email = "L'email est requis.";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Format d'email invalide.";
  }

  if (!values.password) {
    errors.password = "Le mot de passe est requis.";
  } else if (values.password.length < 6) {
    errors.password = "Le mot de passe doit contenir au moins 6 caracteres.";
  } else if (getPasswordStrengthScore(values.password) < 2) {
    errors.password =
      "Mot de passe trop faible: ajoute au moins 2 types (maj, min, chiffre, symbole).";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "La confirmation est requise.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Les mots de passe ne correspondent pas.";
  }

  return errors;
};
