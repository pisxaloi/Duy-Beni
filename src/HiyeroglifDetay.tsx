import React from "react";

interface HiyeroglifDetayProps {
  activeEgDetail: string | null;
  onClose: () => void;
}

const HiyeroglifDetay: React.FC<HiyeroglifDetayProps> = ({
  activeEgDetail,
  onClose,
}) => {
  if (!activeEgDetail) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a1a2e",
          border: "1px solid #c9a84c",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "500px",
          width: "100%",
          color: "#e8d5a3",
          fontFamily: "'Times New Roman', serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            textAlign: "center",
            color: "#c9a84c",
            marginBottom: "16px",
            fontSize: "20px",
          }}
        >
          {activeEgDetail}
        </h2>
        <button
          onClick={onClose}
          style={{
            display: "block",
            margin: "16px auto 0",
            padding: "8px 24px",
            background: "#c9a84c",
            color: "#1a1a2e",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Kapat
        </button>
      </div>
    </div>
  );
};

export default HiyeroglifDetay;
