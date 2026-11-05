import { ImageResponse } from "next/og";

export const alt = "Ledgerly: Business banking, simplified.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#0B1B33",
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0, transparent 41px, rgba(255,255,255,0.05) 41px, rgba(255,255,255,0.05) 42px)",
        color: "#F4F7FB",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ display: "flex", position: "relative", width: 72, height: 72 }}>
          <div
            style={{
              position: "absolute",
              left: 20,
              top: 14,
              width: 12,
              height: 30,
              borderRadius: 6,
              background: "#F4F7FB",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 20,
              top: 48,
              width: 34,
              height: 12,
              borderRadius: 6,
              background: "linear-gradient(135deg, #10B981, #0EA5A4)",
            }}
          />
        </div>
        <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1.5 }}>ledgerly</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <span style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>
          Business banking, simplified.
        </span>
        <span style={{ fontSize: 30, color: "rgba(244,247,251,0.65)" }}>
          Accounts, payments, cards and cash-flow insight in one calm dashboard.
        </span>
      </div>
      <div
        style={{
          display: "flex",
          height: 10,
          borderRadius: 5,
          background: "linear-gradient(90deg, #10B981, #0EA5A4)",
          width: 260,
        }}
      />
    </div>,
    size,
  );
}
