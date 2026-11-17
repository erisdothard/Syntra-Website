import type { Barrier, Region } from './types'

/**
 * Sample figures for the operations view's demo week. Labelled as sample data on
 * screen; they show what leadership would see, not real Charlotte Works usage.
 * Live referrals and AI calls made in this browser are added on top.
 */
export const SAMPLE_WEEK = {
  started: 214,
  plans: 171,
  askedPerson: 46,
  contacted: 31,
}

export const SAMPLE_NEEDS: Record<Region, Record<Barrier, number>> = {
  central: { childcare: 14, transportation: 9, housing: 11, utilities: 6 },
  north: { childcare: 11, transportation: 13, housing: 5, utilities: 4 },
  south: { childcare: 6, transportation: 7, housing: 3, utilities: 5 },
  east: { childcare: 12, transportation: 10, housing: 9, utilities: 8 },
  west: { childcare: 15, transportation: 17, housing: 8, utilities: 7 },
}

export const REGION_ORDER: Region[] = ['west', 'east', 'central', 'north', 'south']
export const BARRIER_ORDER: Barrier[] = ['childcare', 'transportation', 'housing', 'utilities']
