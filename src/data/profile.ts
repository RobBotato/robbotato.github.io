export interface Experience {
  company: string;
  location: string;
  role: string;
  period: string;
  logoUrl: string;
  summary: string;
  skills: string[];
}

export interface Education {
  school: string;
  degree: string;
  period: string;
  gpa: string;
  details?: string[];
}

export interface Project {
  name: string;
  tech: string;
  bullets: string[];
}

export interface Award {
  title: string;
  date: string;
}

export interface SkillCategory {
  name: string;
  skills: string[];
}

export const profile = {
  name: "Robert Li",
  tagline: "Competitive Programmer • USACO Silver • Aspiring Security Researcher",
  region: "San Francisco Bay Area",
  contact: {
    phone: "",
    email: "lirobert2009@gmail.com",
    linkedin: "https://www.linkedin.com/in/robertli0",
    github: "https://github.com/RobBotato",
    website: "https://robbotato.github.io",
  },
  about: {
    bio: "I'm a high school sophomore at Amador Valley High School who spends most of his free time on competitive programming. I qualified for the USACO Silver division, teach Python to a class of middle schoolers, and captain my school's varsity swim team. I'm heading into a Cybersecurity pathway and want to work in network security and ethical hacking.",
    highlights: [
      "Python",
      "Java",
      "C++",
      "USACO Silver",
      "Algorithms",
      "Linux",
      "Cybersecurity",
    ],
  },
};

export const experiences: Experience[] = [
  {
    company: "ACE Coding Club",
    location: "Harvest Park Middle School, Pleasanton, CA",
    role: "Python Instructor",
    period: "Jan 2025 – Present",
    logoUrl: "",
    summary:
      "Instruct a class of 15+ middle school students in fundamental Python, reaching a 100% project completion rate for the intro curriculum. Built and refined 10+ hands-on lesson plans on variables, loops, and beginner algorithms, and mentor students through debugging sessions to sharpen their computational thinking.",
    skills: ["Python", "Curriculum Design", "Mentorship", "Debugging"],
  },
  {
    company: "AVHS Varsity Swim Team",
    location: "Pleasanton, CA",
    role: "Team Captain",
    period: "Feb 2025 – Present",
    logoUrl: "",
    summary:
      "Manage and motivate a roster of 20+ varsity athletes, working with the coaching staff to run weekly training programs. Act as the primary liaison between athletes and coaches, and mentor underclassmen on goal-setting and technique to keep the team performing consistently.",
    skills: ["Leadership", "Team Management", "Communication"],
  },
];

export const skillCategories: SkillCategory[] = [
  {
    name: "Languages",
    skills: ["Python", "Java", "C++"],
  },
  {
    name: "Tools",
    skills: ["Git", "GitHub", "VS Code", "Linux", "Bash"],
  },
  {
    name: "CS Concepts",
    skills: [
      "Data Structures",
      "Algorithms",
      "OOP",
      "Dynamic Programming",
      "Graph Algorithms",
      "Greedy",
      "Binary Search",
    ],
  },
  {
    name: "Focus Areas",
    skills: [
      "Cybersecurity",
      "Network Security",
      "Ethical Hacking",
      "Competitive Programming",
    ],
  },
];

export const education: Education[] = [
  {
    school: "Amador Valley High School",
    degree: "High School Diploma",
    period: "2024 – 2028 (Expected)",
    gpa: "3.8",
    details: [
      "AP Computer Science A — perfect score, first semester",
      "CTE Computer Science Pathway; Cybersecurity pathway enrolled for 2026–2027",
      "Honors Pre-Calculus, Physics, Chemistry, Honors English, AP World History",
    ],
  },
];

export const projects: Project[] = [
  {
    name: "Project One",
    tech: "Python",
    bullets: [
      "Replace with a real project — one line on what it does and why it matters.",
      "A second line on impact, scale, or an interesting technical detail.",
    ],
  },
  {
    name: "Project Two",
    tech: "C++",
    bullets: [
      "Replace with a real project — one line on what it does and why it matters.",
      "A second line on impact, scale, or an interesting technical detail.",
    ],
  },
  {
    name: "Project Three",
    tech: "Java",
    bullets: [
      "Replace with a real project — one line on what it does and why it matters.",
      "A second line on impact, scale, or an interesting technical detail.",
    ],
  },
];

export const awards: Award[] = [
  {
    title: "USACO Silver Division — 972/1000 in the First Bronze Contest",
    date: "2026",
  },
  {
    title: "Perfect score, AP Computer Science A (Semester 1)",
    date: "2025",
  },
  {
    title: "100+ LeetCode problems solved — arrays, dynamic programming, trees",
    date: "Ongoing",
  },
];

export const navLinks = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Skills", href: "#skills" },
  { label: "Education", href: "#education" },
  { label: "Projects", href: "#projects" },
];
