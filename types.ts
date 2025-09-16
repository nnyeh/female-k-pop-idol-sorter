

export interface Idol {
  id: number;
  name: string;
  group: string;
  imageUrl: string;
  wins: number;
  gen: string;
}

// New type for raw idol data before getting an ID
export interface IdolData {
  name: string;
  imageUrl: string;
  gen: string;
}

// New type for groups
export interface Group {
  name:string;
  key: string;
  idols: IdolData[];
}

export enum GamePhase {
  LOADING,
  SETUP,
  PLAYING,
  FINISHED
}

// A matchup is a pair of idols to be compared.
export type Matchup = [Idol, Idol];

// New types for filter options
export interface FilterSubOption {
  name: string;
  key: string;
}

export interface FilterOption {
  name: string;
  key: string;
  tooltip: string;
  checked: boolean;
  sub: FilterSubOption[];
}

export interface FilterSummary {
  groups: string[];
  gens: string[];
  idolCount: number;
  groupCount: number;
}