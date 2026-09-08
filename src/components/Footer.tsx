import { motion } from "framer-motion";
import { SiGithub, SiLinkedin } from "react-icons/si";
import { HiOutlineMail } from "react-icons/hi";
import { profile } from "@/data/profile";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { href: profile.contact.github, icon: SiGithub, label: "GitHub" },
    { href: profile.contact.linkedin, icon: SiLinkedin, label: "LinkedIn" },
    { href: `mailto:${profile.contact.email}`, icon: HiOutlineMail, label: "Email" },
  ];

  return (
    <footer className="py-12 px-4 border-t border-border/30">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center md:text-left"
          >
            <p className="font-display font-bold text-lg text-gradient mb-1">
              {profile.name}
            </p>
            <p className="text-sm text-muted-foreground">
              © {currentYear} All rights reserved.
            </p>
          </motion.div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith('http') ? "_blank" : undefined}
                  rel={link.href.startsWith('http') ? "noopener noreferrer" : undefined}
                  className="p-3 glass rounded-xl transition-all"
                  aria-label={link.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, type: "spring", bounce: 0.4 }}
                  whileHover={{ y: -4, scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon size={20} />
                </motion.a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
