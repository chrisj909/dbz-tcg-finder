// Static geocoding for distance-from-Birmingham.
// Covers cities that commonly appear in Craigslist "bham" results (Alabama +
// adjacent metros that CL's "nearby areas" pulls in). No API key required.
// Birmingham reference: 33.5186° N, 86.8104° W (zip 35203)

const BIRMINGHAM = [33.5186, -86.8104]

// [lat, lng] per city name (lowercase). City names must match what CL puts in
// the .meta "location" field — typically "City" or "City, AL".
const CITY_COORDS = {
  // Jefferson County / Metro Birmingham
  birmingham: [33.5186, -86.8104],
  hoover: [33.4054, -86.8114],
  vestavia: [33.4487, -86.7861],
  'vestavia hills': [33.4487, -86.7861],
  homewood: [33.4668, -86.8019],
  mountain: [33.4859, -86.7458],
  'mountain brook': [33.4859, -86.7458],
  trussville: [33.6207, -86.6088],
  'center point': [33.5827, -86.6883],
  centerpoint: [33.5827, -86.6883],
  gardendale: [33.6565, -86.8122],
  fultondale: [33.6098, -86.7883],
  fairfield: [33.4856, -86.9122],
  hueytown: [33.4598, -86.9986],
  bessemer: [33.4018, -86.9544],
  tarrant: [33.5848, -86.7714],
  'moody city': [33.5982, -86.4939],
  moody: [33.5982, -86.4939],
  odenville: [33.6757, -86.4036],
  pinson: [33.6732, -86.6897],
  clay: [33.7021, -86.6100],
  irondale: [33.5354, -86.6886],
  leeds: [33.5482, -86.5447],

  // Shelby County (south of Birmingham)
  pelham: [33.2843, -86.7844],
  alabaster: [33.2293, -86.8164],
  calera: [33.1009, -86.7519],
  columbiana: [33.1762, -86.6086],
  chelsea: [33.3399, -86.6336],
  'helena city': [33.2960, -86.8442],
  helena: [33.2960, -86.8442],
  montevallo: [33.0998, -86.8636],
  sterrett: [33.4249, -86.4864],

  // Blount County (north)
  oneonta: [33.9479, -86.4711],
  'remlap city': [33.7982, -86.5939],

  // St. Clair County (east)
  pell: [33.5854, -86.2858],
  'pell city': [33.5854, -86.2858],
  ashville: [33.8357, -86.2550],

  // Walker County (northwest)
  jasper: [33.8315, -87.2786],
  'jasper city': [33.8315, -87.2786],

  // Tuscaloosa area (west)
  tuscaloosa: [33.2098, -87.5692],
  northport: [33.2346, -87.5836],
  cottondale: [33.2015, -87.4325],

  // Gadsden / Anniston / Calhoun County (northeast)
  gadsden: [33.9999, -86.0066],
  anniston: [33.6596, -85.8316],
  oxford: [33.6143, -85.8352],
  'jacksonville al': [33.8140, -85.7597],
  jacksonville: [33.8140, -85.7597],
  talladega: [33.4357, -86.1036],

  // Huntsville / north Alabama
  huntsville: [34.7304, -86.5861],
  decatur: [34.6059, -86.9833],
  athens: [34.8026, -86.9716],
  madison: [34.6993, -86.7483],
  'madison city': [34.6993, -86.7483],

  // Montgomery / central Alabama
  montgomery: [32.3617, -86.2792],
  prattville: [32.4641, -86.4597],
  wetumpka: [32.5432, -86.2058],

  // Auburn / Columbus area (east)
  auburn: [32.6099, -85.4808],
  opelika: [32.6451, -85.3783],
  phenix: [32.4710, -85.0002],
  'phenix city': [32.4710, -85.0002],

  // Neighboring states (CL "nearby areas" sometimes bleeds in)
  atlanta: [33.7490, -84.3880],
  chattanooga: [35.0456, -85.3097],
  nashville: [36.1627, -86.7816],
  knoxville: [35.9606, -83.9207],
  memphis: [35.1495, -90.0490],
  columbus: [32.4610, -84.9877], // Columbus, GA
  pensacola: [30.4213, -87.2169],
  mobile: [30.6954, -88.0399],
  florence: [34.7998, -87.6773], // Florence, AL
  muscle: [34.7443, -87.6678],
  'muscle shoals': [34.7443, -87.6678],
}

// Haversine distance in miles between two [lat, lng] points.
function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// Return distance in miles from Birmingham for a location string, or null if unknown.
export function distanceFromBirmingham(locationStr) {
  if (!locationStr) return null
  // Normalize: lowercase, strip state suffix (", AL", ", TN", etc.), strip extra whitespace.
  const key = locationStr
    .toLowerCase()
    .replace(/,\s*[a-z]{2}$/i, '')
    .trim()
  const coords = CITY_COORDS[key]
  if (!coords) return null
  return Math.round(haversine(BIRMINGHAM, coords))
}
