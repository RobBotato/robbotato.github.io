const AuroraBackground = () => {
  return (
    <>
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        {/* Extra deep-space nebula streaks */}
        <div className="aurora-blob aurora-blob-4" />
        <div className="aurora-blob aurora-blob-5" />
      </div>
      {/* Cosmic vignette — darkens edges for depth */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: "radial-gradient(ellipse at center, transparent 40%, hsl(222 47% 3% / 0.6) 100%)",
        }}
        aria-hidden
      />
      <div className="noise" />
    </>
  );
};

export default AuroraBackground;
