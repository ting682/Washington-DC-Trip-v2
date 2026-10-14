export interface DayMood {
  label: string;
  icon: string;
  vars: Record<string, string>;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SiteKnowledge {
  title: string;
  category: string;
  icon: string;
  what: string;
  why: string;
  kids: string;
}

export interface SiteImage {
  src: string;
  alt: string;
  credit: string;
  creditUrl: string;
}

export interface SitePhone {
  number: string;
  label: string;
}

export interface MetroGuide {
  steps: string[];
  pay: string[];
  links: { label: string; url: string; icon: string }[];
}

export interface UberMeta {
  estFare?: string;
  time?: string;
  seats?: string;
}

export interface WalkMeta {
  steps?: string;
  dist?: string;
  time?: string;
}

export interface FlightMeta {
  depGate: string;
  arrGate: string;
  carousel?: string;
}

export interface TripItem {
  type: 'site' | 'food' | 'transit-uber' | 'transit-walk' | 'transit-metro' | 'flight' | 'bedtime';
  time: string;
  duration?: string;
  title: string;
  location?: string;
  website?: string;
  desc?: string;
  icon?: string;
  siteKey?: string;
  phone?: string;
  isDinner?: boolean;
  dayIndex?: number;
  uberMeta?: UberMeta;
  walkMeta?: WalkMeta;
  metroMeta?: { line: string; duration: string; stops: string };
  metroGuide?: MetroGuide;
  flightMeta?: FlightMeta;
  destCoords?: Coordinates;
  destName?: string;
  destAddress?: string;
}

export interface DinnerItem {
  time: string;
  name: string;
  location: string;
  website: string;
  duration: string;
  desc: string;
  coords: Coordinates | null;
}

export interface DayData {
  day: string;
  theme: string;
  tagline: string;
  bedtime?: {
    time: string;
    title: string;
    desc: string;
    duration: string;
  };
  afternoonStop?: { name: string; coords: Coordinates };
  dinner?: DinnerItem | null;
  fixedStopsBefore: TripItem[];
  items?: TripItem[];
}

export interface PackingItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
}

export interface PassItem {
  id: string;
  title: string;
  conf: string;
  time: string;
  checked: boolean;
}

export interface SpyMission {
  cipher: string;
  display: string;
  answer: string;
  hint: string;
}

export interface TripPhoto {
  id: string;
  dayIndex: number;
  dayLabel: string;
  dayTheme: string;
  src: string;
  alt: string;
  title: string;
  caption?: string;
  credit?: string;
  creditUrl?: string;
  siteKey?: string;
  uploadedByUser?: boolean;
  uploadedAt?: string;
  tags?: string[];
  accountOwner?: 'account1' | 'account2';
  accountOwnerName?: string;
  accountOwnerEmail?: string;
  googleMediaItemId?: string;
}

export interface GoogleAccountInfo {
  id: 'account1' | 'account2';
  customLabel: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastSyncTime: string | null;
  photoCount: number;
}

export interface GoogleAlbumResult {
  id: string;
  title: string;
  productUrl: string;
  shareableUrl?: string;
  isShared?: boolean;
  itemCount?: number;
  createdAt: string;
  creatorAccountLabel?: string;
}
