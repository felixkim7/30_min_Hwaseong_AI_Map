// Lightweight place-name → coordinate lookup for known Hwaseong landmarks.
// Reports don't collect real lat/lng yet (that needs a geocoding API, out of
// scope for the demo — see phase 04 notes), so we match location_name against
// this table to place markers. Falls back to the city-center coordinate.

export const HWASEONG_CENTER: [number, number] = [37.1996, 126.8312];

type Landmark = {
  name: string;
  district: string;
  lat: number;
  lng: number;
};

// Ordered roughly by how commonly citizens would reference them. Matching is
// substring-based (see resolveLocation), so list more specific names first
// when one name is a substring of another.
const LANDMARKS: Landmark[] = [
  { name: "동탄역", district: "동탄", lat: 37.2003, lng: 127.0973 },
  { name: "동탄", district: "동탄", lat: 37.2013, lng: 127.0955 },
  { name: "병점역", district: "병점동", lat: 37.2062, lng: 126.9986 },
  { name: "병점", district: "병점동", lat: 37.2062, lng: 126.9986 },
  { name: "봉담", district: "봉담읍", lat: 37.2094, lng: 126.9227 },
  { name: "향남", district: "향남읍", lat: 37.1372, lng: 126.9127 },
  { name: "남양", district: "남양읍", lat: 37.2136, lng: 126.8305 },
  { name: "비봉", district: "비봉면", lat: 37.2494, lng: 126.8672 },
  { name: "야목역", district: "정남면", lat: 37.2378, lng: 126.8681 },
  { name: "화성시청", district: "남양읍", lat: 37.1996, lng: 126.8312 },
  { name: "능동", district: "능동", lat: 37.2039, lng: 127.0817 },
  { name: "반송동", district: "반송동", lat: 37.1971, lng: 127.0725 },
  { name: "석우동", district: "석우동", lat: 37.1930, lng: 127.0819 },
  { name: "송산", district: "송산면", lat: 37.1897, lng: 126.7429 },
  { name: "우정", district: "우정읍", lat: 37.0553, lng: 126.8399 },
  { name: "장안", district: "장안면", lat: 37.1075, lng: 126.8523 },
  { name: "매송", district: "매송면", lat: 37.2469, lng: 126.9539 },
];

export function resolveLocation(locationName: string): {
  lat: number;
  lng: number;
  district: string;
} {
  const match = LANDMARKS.find((landmark) =>
    locationName.includes(landmark.name)
  );

  if (match) {
    return { lat: match.lat, lng: match.lng, district: match.district };
  }

  return {
    lat: HWASEONG_CENTER[0],
    lng: HWASEONG_CENTER[1],
    district: "화성시",
  };
}

export const districtOptions = [
  "동탄",
  "병점동",
  "봉담읍",
  "향남읍",
  "남양읍",
  "비봉면",
  "정남면",
  "능동",
  "반송동",
  "석우동",
  "송산면",
  "우정읍",
  "장안면",
  "매송면",
  "화성시",
] as const;
