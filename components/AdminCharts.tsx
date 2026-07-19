"use client";

import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { copy } from "@/lib/copy";

type ChartDatum = { name: string; count: number };

// Distinct, higher-contrast colors per chart — previously both charts used
// the same flat #3f3f46 gray, which made bars hard to tell apart from the
// grid lines/background at a glance.
const CHART_COLORS = {
  sub_category: "#2563eb",
  district: "#059669",
} as const;

function Chart({
  title,
  data,
  field,
}: {
  title: string;
  data: ChartDatum[];
  field: "sub_category" | "district";
}) {
  const router = useRouter();
  const color = CHART_COLORS[field];

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [
                `${value ?? 0}${copy.admin.charts.countSuffix}`,
                "",
              ]}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(item) => {
                const datum = item.payload as ChartDatum;
                router.push(
                  `/admin/reports?field=${field}&value=${encodeURIComponent(datum.name)}`
                );
              }}
            >
              {data.map((datum) => (
                <Cell key={datum.name} fill={color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        {copy.admin.charts.clickHint}
      </p>
    </div>
  );
}

export function AdminCharts({
  bySubCategory,
  byDistrict,
}: {
  bySubCategory: ChartDatum[];
  byDistrict: ChartDatum[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Chart
        title={copy.admin.charts.bySubCategory}
        data={bySubCategory}
        field="sub_category"
      />
      <Chart
        title={copy.admin.charts.byDistrict}
        data={byDistrict}
        field="district"
      />
    </div>
  );
}
