"use client";

import { useState } from "react";
import {
  Map as KakaoMap,
  MapMarker,
  CustomOverlayMap,
  useKakaoLoader,
} from "react-kakao-maps-sdk";
import { copy } from "@/lib/copy";
import { HWASEONG_CENTER } from "@/lib/geocode";
import type { SavedReport } from "@/lib/schema";

export type PlottedReport = SavedReport & { lat: number; lng: number };

export function ReportMap({ reports }: { reports: PlottedReport[] }) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
  });
  const [openId, setOpenId] = useState<string | null>(null);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-sm text-red-600 dark:bg-zinc-950 dark:text-red-400">
        {copy.map.loadError}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
        {copy.map.loading}
      </div>
    );
  }

  return (
    <KakaoMap
      center={{ lat: HWASEONG_CENTER[0], lng: HWASEONG_CENTER[1] }}
      level={8}
      className="h-full w-full"
    >
      {reports.map((report) => (
        <MapMarker
          key={report.id}
          position={{ lat: report.lat, lng: report.lng }}
          onClick={() =>
            setOpenId((current) => (current === report.id ? null : report.id))
          }
        />
      ))}
      {reports
        .filter((report) => report.id === openId)
        .map((report) => (
          <CustomOverlayMap
            key={report.id}
            position={{ lat: report.lat, lng: report.lng }}
            yAnchor={1.4}
          >
            <div className="relative rounded-lg bg-white p-3 text-sm shadow-lg ring-1 ring-zinc-200">
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="absolute right-1.5 top-1.5 text-zinc-400 hover:text-zinc-700"
                aria-label="닫기"
              >
                ×
              </button>
              <div className="flex flex-col gap-1 pr-4">
                <p className="font-medium text-zinc-900">{report.summary}</p>
                <p className="text-zinc-600">
                  {report.sub_category} · {report.time_pattern}
                </p>
                <p className="text-zinc-600">
                  {copy.map.popup.severity}: {report.severity}
                </p>
              </div>
            </div>
          </CustomOverlayMap>
        ))}
    </KakaoMap>
  );
}
