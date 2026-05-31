import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'

const client = new Client()

export async function POST(req: NextRequest) {
  const { address } = await req.json()

  if (!address) {
    return NextResponse.json({ error: 'No address provided' }, { status: 400 })
  }

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
  } catch (error) {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 })
  }
}