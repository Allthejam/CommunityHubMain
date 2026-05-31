
'use server';

type ActionResponse = {
  success: boolean;
  isPlausible: boolean;
  reason: string;
};

export async function verifyLocationAction(params: {
  country: string;
  state: string;
  region: string;
  community: string;
}): Promise<ActionResponse> {
  const { community, region, state, country } = params;

  if (!community) {
    return { success: false, isPlausible: false, reason: "Community name is required for verification." };
  }

  // Construct a search query. The more specific, the better.
  const query = `${community}, ${region}, ${state}, ${country}`;

  try {
    // Using OpenStreetMap's Nominatim API - a free and public service.
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: {
            'User-Agent': 'CommunityHub/1.0 (Contact: tech@my-community-hub.co.uk)' // OSM requires a user-agent
        }
    });
    
    if (!response.ok) {
      throw new Error(`Location service responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      // Found at least one match, so it's plausible.
      return {
        success: true,
        isPlausible: true,
        reason: "This location appears to be valid according to our location service.",
      };
    } else {
      // No results found.
      return {
        success: false,
        isPlausible: false,
        reason: "This location could not be verified. Please check the spelling and ensure all fields are correct.",
      };
    }
  } catch (error: any) {
    console.error("Error during location verification:", error);
    return { 
        success: false, 
        isPlausible: false, 
        reason: `An error occurred while trying to verify the location: ${error.message}` 
    };
  }
}
