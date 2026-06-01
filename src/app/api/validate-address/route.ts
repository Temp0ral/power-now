import { NextRequest, NextResponse } from 'next/server'
import { Client, PlaceAutocompleteType } from '@googlemaps/google-maps-services-js'

const client = new Client()

export async function POST(req: NextRequest) {
  const { address, autocomplete } = await req.json()

  if (!address) {
    return NextResponse.json({ error: 'No address provided' }, { status: 400 })
  }

  // Autocomplete mode — return suggestions
  if (autocomplete) {
    try {
      const response = await client.placeAutocomplete({
        params: {
          input: address,
          types: PlaceAutocompleteType.address,
          components: ['country:us'],
          key: process.env.GOOGLE_MAPS_API_KEY!,
        },
      })
      const suggestions = response.data.predictions.map((p) => p.description)
      return NextResponse.json({ suggestions })
    } catch {
      return NextResponse.json({ suggestions: [] })
    }
  }

  // Validation mode — return formatted address
  try {
    const response = await client.geocode({
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    })
    const result = response.data.results[0]
    if (!result) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }
    return NextResponse.json({
      formatted_address: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    })
 } catch {
  return NextResponse.json({ suggestions: [] })
}
}