/**
 * Kuwait Courts Directory
 * Maps court names (Arabic) to their Google Maps coordinates and metadata.
 * Used for Google Maps integration in case views and hearing cards.
 */

export interface CourtInfo {
  nameAr: string;
  nameEn: string;
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  type: "civil" | "criminal" | "commercial" | "family" | "appeal" | "cassation";
}

export const KUWAIT_COURTS: Record<string, CourtInfo> = {
  // Main Courts Complex - Kuwait City
  "قصر العدل": {
    nameAr: "قصر العدل",
    nameEn: "Palace of Justice",
    lat: 29.3759,
    lng: 47.9774,
    address: "شارع الخليج العربي، مدينة الكويت",
    phone: "+965 2248 4000",
    type: "civil",
  },
  // District Courts
  "ن. مبارك الكبير": {
    nameAr: "محكمة مبارك الكبير",
    nameEn: "Mubarak Al-Kabeer Court",
    lat: 29.2194,
    lng: 48.0919,
    address: "منطقة مبارك الكبير",
    type: "civil",
  },
  "ن. الأحمدي": {
    nameAr: "محكمة الأحمدي",
    nameEn: "Ahmadi Court",
    lat: 29.0769,
    lng: 48.0838,
    address: "محافظة الأحمدي",
    type: "civil",
  },
  "ن. حولي": {
    nameAr: "محكمة حولي",
    nameEn: "Hawally Court",
    lat: 29.3325,
    lng: 48.0286,
    address: "محافظة حولي",
    type: "civil",
  },
  "ن. الفروانية": {
    nameAr: "محكمة الفروانية",
    nameEn: "Farwaniya Court",
    lat: 29.2775,
    lng: 47.9585,
    address: "محافظة الفروانية",
    type: "civil",
  },
  "ن. الجهراء": {
    nameAr: "محكمة الجهراء",
    nameEn: "Jahra Court",
    lat: 29.3375,
    lng: 47.6581,
    address: "محافظة الجهراء",
    type: "civil",
  },
  "ن. العاصمة": {
    nameAr: "محكمة العاصمة",
    nameEn: "Capital Court",
    lat: 29.3759,
    lng: 47.9774,
    address: "محافظة العاصمة، قصر العدل",
    type: "civil",
  },
  // Specialized Courts
  "المحكمة التجارية": {
    nameAr: "المحكمة التجارية",
    nameEn: "Commercial Court",
    lat: 29.3759,
    lng: 47.9774,
    address: "قصر العدل، مدينة الكويت",
    type: "commercial",
  },
  "محكمة الأسرة": {
    nameAr: "محكمة الأسرة",
    nameEn: "Family Court",
    lat: 29.3759,
    lng: 47.9774,
    address: "قصر العدل، مدينة الكويت",
    type: "family",
  },
  "محكمة الاستئناف": {
    nameAr: "محكمة الاستئناف",
    nameEn: "Court of Appeal",
    lat: 29.3759,
    lng: 47.9774,
    address: "قصر العدل، مدينة الكويت",
    type: "appeal",
  },
  "محكمة التمييز": {
    nameAr: "محكمة التمييز",
    nameEn: "Court of Cassation",
    lat: 29.3759,
    lng: 47.9774,
    address: "قصر العدل، مدينة الكويت",
    type: "cassation",
  },
  "المحكمة الجزائية": {
    nameAr: "المحكمة الجزائية",
    nameEn: "Criminal Court",
    lat: 29.3759,
    lng: 47.9774,
    address: "قصر العدل، مدينة الكويت",
    type: "criminal",
  },
};

/**
 * Find a court by partial name match (handles MOJ abbreviations)
 */
export function findCourt(courtName: string): CourtInfo | null {
  // Direct match
  if (KUWAIT_COURTS[courtName]) return KUWAIT_COURTS[courtName];

  // Partial match
  const normalized = courtName.trim();
  for (const [key, court] of Object.entries(KUWAIT_COURTS)) {
    if (
      key.includes(normalized) ||
      normalized.includes(key) ||
      court.nameAr.includes(normalized) ||
      normalized.includes(court.nameAr)
    ) {
      return court;
    }
  }
  return null;
}

/**
 * Generate a Google Maps URL for a court
 */
export function getCourtMapsUrl(courtName: string): string | null {
  const court = findCourt(courtName);
  if (!court) return null;
  return `https://www.google.com/maps/search/?api=1&query=${court.lat},${court.lng}&query_place_id=${encodeURIComponent(court.nameEn)}`;
}

/**
 * Generate a Google Maps directions URL to a court
 */
export function getCourtDirectionsUrl(courtName: string): string | null {
  const court = findCourt(courtName);
  if (!court) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${court.lat},${court.lng}&destination_place_id=${encodeURIComponent(court.nameEn)}`;
}

/**
 * Generate a static map image URL (no API key needed for basic embed)
 */
export function getCourtStaticMapUrl(courtName: string, width = 400, height = 200): string | null {
  const court = findCourt(courtName);
  if (!court) return null;
  // Uses OpenStreetMap static tiles (no API key required)
  const zoom = 15;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${court.lat},${court.lng}&zoom=${zoom}&size=${width}x${height}&markers=${court.lat},${court.lng},red-pushpin`;
}
