import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0B1B33",
        display: "flex",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 51,
          top: 37,
          width: 28,
          height: 73,
          borderRadius: 14,
          background: "#F4F7FB",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 51,
          top: 121,
          width: 82,
          height: 28,
          borderRadius: 14,
          background: "linear-gradient(135deg, #10B981, #0EA5A4)",
        }}
      />
    </div>,
    size,
  );
}
