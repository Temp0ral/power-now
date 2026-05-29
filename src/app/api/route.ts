import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'

const client = new Client()

export async function POST(req: NextRequest) {
  const { addresses } = await req.json()

  if (!addresses || addresses.length < 2) {
    return NextResponse.json({ order: addresses.map((_: string, i: number) => i) })
  }

  try {
    // Get distance matrix between all addresses
    const response = await client.distancematrix({
      params: {
        origins: addresses,
        destinations: addresses,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    })

    const matrix = response.data.rows.map((row) =>
      row.elements.map((el) => el.duration?.value ?? 999999)
    )

    // Nearest neighbor algorithm to order stops
    const n = addresses.length
    const visited = new Array(n).fill(false)
    const order = [0]
    visited[0] = true

    for (let i = 1; i < n; i++) {
      const last = order[order.length - 1]
      let nearest = -1
      let nearestDist = Infinity
      for (let j = 0; j < n; j++) {
        if (!visited[j] && matrix[last][j] < nearestDist) {
          nearest = j
          nearestDist = matrix[last][j]
        }
      }
      order.push(nearest)
      visited[nearest] = true
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Google Maps error:', error)
    return NextResponse.json({ order: addresses.map((_: string, i: number) => i) })
  }
}