import { ImageResponse } from "next/og";

export const alt = "Reps — The daily loop, verified.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f2f3f7",
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 36,
            background: "#30d158",
          }}
        >
          <span
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1,
            }}
          >
            R
          </span>
        </div>
        <span
          style={{
            marginTop: 40,
            fontSize: 40,
            fontWeight: 800,
            color: "#17181c",
            letterSpacing: -0.5,
          }}
        >
          The daily loop, verified.
        </span>
      </div>
    ),
    { ...size }
  );
}
