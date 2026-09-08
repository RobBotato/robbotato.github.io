import { X, Download, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ResumeModal = ({ isOpen, onClose }: ResumeModalProps) => {
  const resumePath = "/resume.pdf";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-4 md:inset-10 lg:inset-20 z-50 glass rounded-3xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border/50">
              <h2 className="font-display text-xl md:text-2xl font-bold">Resume</h2>
              <div className="flex items-center gap-2">
                <a
                  href={resumePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 md:px-4 md:py-2 rounded-xl hover:bg-foreground/5 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <ExternalLink size={18} />
                  <span className="hidden md:inline">Open in New Tab</span>
                </a>
                <a
                  href={resumePath}
                  download="Robert_Li_Resume.pdf"
                  className="p-2 md:px-4 md:py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Download size={18} />
                  <span className="hidden md:inline">Download</span>
                </a>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-foreground/5 transition-colors ml-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 p-4 md:p-6">
              <object
                data={resumePath}
                type="application/pdf"
                className="w-full h-full rounded-2xl bg-secondary/50"
              >
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <p className="text-muted-foreground mb-4">
                    Unable to display PDF. Please download or open in a new tab.
                  </p>
                  <div className="flex gap-4">
                    <a
                      href={resumePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 rounded-xl glass hover-lift flex items-center gap-2 font-medium"
                    >
                      <ExternalLink size={18} />
                      Open PDF
                    </a>
                    <a
                      href={resumePath}
                      download="Robert_Li_Resume.pdf"
                      className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 font-medium"
                    >
                      <Download size={18} />
                      Download
                    </a>
                  </div>
                </div>
              </object>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ResumeModal;
