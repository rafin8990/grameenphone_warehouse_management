interface Country {
  iso2: string
  iso3: string
  country: string
  cities: string[]
}

interface CountriesResponse {
  error: boolean
  msg: string
  data: Country[]
}

interface CitiesResponse {
  error: boolean
  msg: string
  data: string[]
}

let countriesCache: Country[] | null = null

export async function getCountries(): Promise<Country[]> {
  if (countriesCache) {
    return countriesCache
  }

  try {
    const response = await fetch('https://countriesnow.space/api/v0.1/countries')
    const data: CountriesResponse = await response.json()
    
    if (!data.error) {
      countriesCache = data.data
      return data.data
    }
    throw new Error(data.msg)
  } catch (error) {
    console.error('Error fetching countries:', error)
    return []
  }
}

export async function getCitiesByCountry(country: string): Promise<string[]> {
  try {
    const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ country }),
    })
    const data: CitiesResponse = await response.json()
    
    if (!data.error) {
      return data.data
    }
    throw new Error(data.msg)
  } catch (error) {
    console.error('Error fetching cities:', error)
    return []
  }
} 