"use client";

import { motion } from "framer-motion";
import { formatEuros, type SankeyFlows } from "@/lib/core/finance";

/**
 * The money-flow Sankey (spec §7.1/§7.3): income categories on the left feed
 * a gross spine, which fans out into spending categories plus the unspent
 * Net. Hand-drawn SVG ribbons — soft category tints, hairline nodes — sized
 * for a phone column. Overspending shows an explicit amber "Overspent"
 * source rather than pretending the books balance.
 */

const W = 360;
const NODE_W = 6;
const GAP = 10;
const LABEL_H = 30;
const MIN_H = 170;

const NET_COLOR = "#30d158";
const DEFICIT_COLOR = "#ff9f0a";
const GROSS_COLOR = "#3a3c44";

interface Band {
  id: string;
  label: string;
  cents: number;
  color: string;
  /** Top y of the band's node segment. */
  y: number;
  h: number;
}

function stack(
  items: { id: string; label: string; cents: number; color: string }[],
  scale: number,
  totalH: number,
): Band[] {
  const contentH = items.reduce(
    (s, it) => s + Math.max(it.cents * scale, 3),
    0,
  );
  const gaps = GAP * Math.max(items.length - 1, 0);
  let y = Math.max((totalH - contentH - gaps) / 2, 0);
  return items.map((it) => {
    const h = Math.max(it.cents * scale, 3);
    const band = { ...it, y, h };
    y += h + GAP;
    return band;
  });
}

/** A ribbon from one node edge to another, widths matched at each end. */
function ribbon(
  x1: number,
  y1: number,
  h1: number,
  x2: number,
  y2: number,
  h2: number,
): string {
  const mx = (x1 + x2) / 2;
  return [
    `M ${x1} ${y1}`,
    `C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`,
    `L ${x2} ${y2 + h2}`,
    `C ${mx} ${y2 + h2} ${mx} ${y1 + h1} ${x1} ${y1 + h1}`,
    "Z",
  ].join(" ");
}

export function FinanceSankey({
  flows,
  names,
  colors,
}: {
  flows: SankeyFlows;
  names: Map<string, string>;
  colors: Map<string, string>;
}) {
  const throughput = flows.grossCents + flows.deficitCents; // = spending + net
  const empty = throughput === 0;

  // Left: income sources (+ the overspend gap, if any). Right: spending + net.
  const leftItems = [
    ...flows.sources.map((s) => ({
      id: s.categoryId,
      label: names.get(s.categoryId) ?? "—",
      cents: s.cents,
      color: colors.get(s.categoryId) ?? "#a6a8b0",
    })),
    ...(flows.deficitCents > 0
      ? [{ id: "__deficit", label: "Overspent", cents: flows.deficitCents, color: DEFICIT_COLOR }]
      : []),
  ];
  const rightItems = [
    ...flows.destinations.map((d) => ({
      id: d.categoryId,
      label: names.get(d.categoryId) ?? "—",
      cents: d.cents,
      color: colors.get(d.categoryId) ?? "#a6a8b0",
    })),
    ...(flows.netCents > 0
      ? [{ id: "__net", label: "Net", cents: flows.netCents, color: NET_COLOR }]
      : []),
  ];

  const maxBands = Math.max(leftItems.length, rightItems.length, 1);
  const H = Math.max(MIN_H, maxBands * 34 + LABEL_H);
  const usable = H - LABEL_H;
  const scale =
    throughput > 0
      ? (usable - GAP * (maxBands - 1) - 8) / throughput
      : 0;

  const left = stack(leftItems, scale, usable);
  const right = stack(rightItems, scale, usable);

  // The gross spine: one segment per side, offsets accumulated in band order.
  const grossH = Math.max(throughput * scale, 3);
  const grossY = Math.max((usable - grossH) / 2, 0);
  const grossX = W / 2 - NODE_W / 2;

  const ribbonsFor = (bands: Band[], side: "in" | "out") => {
    const out: (Band & { d: string })[] = [];
    let offset = 0;
    for (const band of bands) {
      const h = (band.cents / throughput) * grossH;
      const d =
        side === "in"
          ? ribbon(NODE_W, band.y, band.h, grossX, grossY + offset, h)
          : ribbon(grossX + NODE_W, grossY + offset, h, W - NODE_W, band.y, band.h);
      offset += h;
      out.push({ ...band, d });
    }
    return out;
  };
  const inRibbons = ribbonsFor(left, "in");
  const outRibbons = ribbonsFor(right, "out");

  return (
    <div className="card-shadow rounded-3xl bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-extrabold tracking-tight text-text">
          Where money goes
        </h2>
        {!empty && (
          <p className="num text-xs font-bold text-sub">
            gross {formatEuros(flows.grossCents)}
          </p>
        )}
      </div>

      {empty ? (
        <p className="flex h-24 items-center justify-center text-xs font-semibold text-mute">
          The flow appears once this period has entries
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            data-testid="finance-sankey"
            className="mt-3 w-full"
            role="img"
            aria-label="Money flow from income sources through gross into spending categories and net"
          >
            <g transform={`translate(0 ${LABEL_H - 8})`}>
              {/* Ribbons under everything */}
              {[...inRibbons, ...outRibbons].map((r, i) => (
                <motion.path
                  key={r.id + i}
                  d={r.d}
                  fill={r.color}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.22 }}
                  transition={{ duration: 0.4, delay: i * 0.03 }}
                />
              ))}

              {/* Side nodes */}
              {left.map((b) => (
                <rect
                  key={b.id}
                  x={0}
                  y={b.y}
                  width={NODE_W}
                  height={b.h}
                  rx={2}
                  fill={b.color}
                />
              ))}
              {right.map((b) => (
                <rect
                  key={b.id}
                  x={W - NODE_W}
                  y={b.y}
                  width={NODE_W}
                  height={b.h}
                  rx={2}
                  fill={b.color}
                />
              ))}

              {/* Gross spine */}
              <rect
                x={grossX}
                y={grossY}
                width={NODE_W}
                height={grossH}
                rx={2}
                fill={GROSS_COLOR}
              />
              <text
                x={W / 2}
                y={grossY - 8}
                textAnchor="middle"
                className="fill-sub"
                fontSize={10}
                fontWeight={700}
              >
                Gross
              </text>

              {/* Labels: left-aligned by sources, right-aligned by destinations */}
              {left.map((b) => (
                <text
                  key={`l-${b.id}`}
                  x={NODE_W + 7}
                  y={b.y + b.h / 2 + 3.5}
                  fontSize={10.5}
                  fontWeight={700}
                  className="fill-text"
                >
                  {b.label}
                  <tspan className="fill-sub" fontWeight={600}>
                    {"  "}
                    {formatEuros(b.cents)}
                  </tspan>
                </text>
              ))}
              {right.map((b) => (
                <text
                  key={`r-${b.id}`}
                  x={W - NODE_W - 7}
                  y={b.y + b.h / 2 + 3.5}
                  textAnchor="end"
                  fontSize={10.5}
                  fontWeight={700}
                  className="fill-text"
                >
                  <tspan className="fill-sub" fontWeight={600}>
                    {formatEuros(b.cents)}
                    {"  "}
                  </tspan>
                  {b.label}
                </text>
              ))}
            </g>
          </svg>

          {flows.deficitCents > 0 && (
            <p className="num mt-2 text-center text-xs font-bold text-warn">
              Spending outran income by {formatEuros(flows.deficitCents)} this
              period
            </p>
          )}
        </>
      )}
    </div>
  );
}
