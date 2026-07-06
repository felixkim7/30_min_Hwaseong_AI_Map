"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { copy } from "@/lib/copy";
import { HWASEONG_CENTER } from "@/lib/geocode";
import type { SavedReport } from "@/lib/schema";

// react-leaflet's default marker icon points at asset paths that don't
// resolve under bundlers — rebuild it from the CDN-served images instead.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type PlottedReport = SavedReport & { lat: number; lng: number };

export function ReportMap({ reports }: { reports: PlottedReport[] }) {
  return (
    <MapContainer
      center={HWASEONG_CENTER}
      zoom={11}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.lat, report.lng]}
          icon={markerIcon}
        >
          <Popup>
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-medium">{report.summary}</p>
              <p className="text-zinc-600">
                {report.sub_category} · {report.time_pattern}
              </p>
              <p className="text-zinc-600">
                {copy.map.popup.severity}: {report.severity}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
