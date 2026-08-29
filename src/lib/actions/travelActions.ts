'use server';

import { generateTravelGuide, type GenerateTravelGuideInput } from '@/ai/flows/generate-travel-guide';
import { type TravelServiceItem } from '@/lib/types/travel';

export async function generateTravelGuideAction(input: GenerateTravelGuideInput): Promise<{ success: boolean; services?: TravelServiceItem[]; error?: string }> {
  try {
    const result = await generateTravelGuide(input);
    return {
      success: true,
      services: result.services as TravelServiceItem[],
    };
  } catch (error: any) {
    console.error('Failed to generate travel guide via AI:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate travel guide with AI.',
    };
  }
}
