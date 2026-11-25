export interface ProjectItem {
  id: number;
  name: string;
  client: string;
  logo: string;
  category: 'web' | 'mobile' | 'custom' | 'enterprise' | 'bumn' | 'consultant';
  tagline: string;
  desc: string;
  detailedCaseStudy?: {
    challenge: string;
    solution: string;
    impact: string[];
    techStack: string[];
    usersCount?: string;
  };
  image: string;
  deviceType?: 'mobile' | 'web' | 'dashboard';
  accentColor: string;
  textColor?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  iconName: string;
  deliverables: string[];
  techStack: string[];
}

export interface TestimonialItem {
  id: number;
  quote: string;
  name: string;
  title: string;
  company: string;
  avatarUrl?: string;
  rating: number;
  projectTag: string;
  metrics?: string;
}

export interface OfficeLocation {
  id: string;
  city: string;
  country: string;
  type: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  gmapsUrl: string;
  hours: string;
}
