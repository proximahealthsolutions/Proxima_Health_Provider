export interface LoginFormProps {
  onSubmit: (data: LoginData) => Promise<void>;
  loading: boolean;
  error: string;
}

export interface LoginData {
  email?: string;
  phone?: string;
  password?: string;
  code?: string;
}

export interface AuthPageConfig {
  role: "provider";
  accentColor: AuthAccent;
  dashboardRoute: string;
  features: string[];
  icon: string;
  tagline: string;
}

export interface AuthAccent {
  glow: string;
  border: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dot: string;
  iconBg: string;
  iconText: string;
  checkBg: string;
  checkBorder: string;
  checkText: string;
  button: string;
  buttonHover: string;
  buttonText: string;
  inputFocus: string;
  link: string;
  linkHover: string;
}
