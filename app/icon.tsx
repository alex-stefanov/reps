import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f2f3f7",
        }}
      >
        <div
          style={{
            width: 440,
            height: 440,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 96,
            background: "#30d158",
          }}
        >
          <span
            style={{
              fontSize: 260,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1,
            }}
          >
            R
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
