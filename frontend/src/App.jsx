import { useState, useEffect } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const MAP_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'

const getHazardCoordinates = (hazard) => {
  const latitude = Number.parseFloat(hazard.latitude ?? hazard.lat)
  const longitude = Number.parseFloat(hazard.longitude ?? hazard.lng)

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null
  }

  return { latitude, longitude }
}

const getImageMimeType = (base64Image) => {
  if (base64Image.startsWith('/9j/')) return 'image/jpeg'
  if (base64Image.startsWith('iVBOR')) return 'image/png'
  if (base64Image.startsWith('R0lGOD')) return 'image/gif'
  if (base64Image.startsWith('UklGR')) return 'image/webp'

  return 'image/jpeg'
}

const getImageUrl = (imageBytes) => {
  if (!imageBytes) return null

  if (imageBytes.startsWith('data:image/')) {
    return imageBytes
  }

  return `data:${getImageMimeType(imageBytes)};base64,${imageBytes}`
}

function App() {
  const [hazards, setHazards] = useState([])
  const [selectedHazardId, setSelectedHazardId] = useState(null)
  const [error, setError] = useState(null)

  const selectedHazard = hazards.find((hazard) => hazard.id === selectedHazardId)
  const selectedCoordinates = selectedHazard ? getHazardCoordinates(selectedHazard) : null
  const selectedImageUrl = selectedHazard ? getImageUrl(selectedHazard.image_bytes) : null

  useEffect(() => {
    const controller = new AbortController()

    const fetchHazards = async () => {
      try {
        setError(null)

        const headers = ACCESS_TOKEN
          ? { Authorization: `Bearer ${ACCESS_TOKEN}` }
          : {}

        const response = await fetch(`${API_BASE_URL}/api/v1/hazards/`, {
          method: 'GET',
          headers,
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`שגיאה בקבלת הנתונים מהשרת (${response.status})`)
        }

        const data = await response.json()
        setHazards(Array.isArray(data) ? data : [])
        setSelectedHazardId(null)
      } catch (err) {
        if (err.name === 'AbortError') return

        console.error(err)
        setError(err.message)
      }
    }

    fetchHazards()

    return () => controller.abort()
  }, [])

  return (
    <main className="app-shell" dir="rtl">
      <section className="page-header">
        <h1>מפת מפגעים עירונית בלייב</h1>
        <p>הצגת נתונים מפורט 8000 על גבי גוגל מאפס</p>
      </section>

      {error && <p className="alert">שגיאה: {error}</p>}

      {!MAP_API_KEY && (
        <p className="alert">
          חסר מפתח Google Maps: יש להגדיר VITE_GOOGLE_MAPS_API_KEY
        </p>
      )}

      {/* 2. עטיפת האזור ברכיב ה-Provider של גוגל עם המפתח שלך */}
      <APIProvider apiKey={MAP_API_KEY}>
        <div className="map-frame">
          
          <Map
            defaultCenter={{ lat: 32.0853, lng: 34.7818 }} // נקודת מוצא (תל אביב)
            defaultZoom={11}
            mapId={MAP_ID}
            gestureHandling={'greedy'}
          >
            
            {/* 3. לולאה שרצה על כל המפגעים ומייצרת סיכות על המפה */}
            {hazards.map((hazard) => {
              const coordinates = getHazardCoordinates(hazard)

              // בדיקת בטיחות: ודא שהנ"צ תקין לפני שמציגים את הסיכה
              if (!coordinates) return null;

              return (
                <AdvancedMarker
                  key={hazard.id}
                  position={{ lat: coordinates.latitude, lng: coordinates.longitude }}
                  title={hazard.description || 'דיווח על מפגע'}
                  onClick={() => setSelectedHazardId(hazard.id)}
                >
                  {/* עיצוב הסיכה עצמה */}
                  <Pin background={'#ef4444'} borderColor={'#b91c1c'} glyphColor={'#ffffff'} />
                </AdvancedMarker>
              )
            })}

            {selectedHazard && selectedCoordinates && (
              <InfoWindow
                position={{ lat: selectedCoordinates.latitude, lng: selectedCoordinates.longitude }}
                maxWidth={260}
                onClose={() => setSelectedHazardId(null)}
                onCloseClick={() => setSelectedHazardId(null)}
              >
                <article className="map-preview" dir="rtl">
                  <button
                    className="map-preview-close"
                    type="button"
                    aria-label="סגור תצוגה מקדימה"
                    onClick={() => setSelectedHazardId(null)}
                  >
                    ×
                  </button>
                  <div className="map-preview-image">
                    {selectedImageUrl ? (
                      <img
                        src={selectedImageUrl}
                        alt={selectedHazard.description || 'תמונת מפגע'}
                      />
                    ) : (
                      <span>אין תמונה</span>
                    )}
                  </div>
                  <div className="map-preview-content">
                    <h3>{selectedHazard.description || 'דיווח על מפגע'}</h3>
                    <p>
                      {selectedCoordinates.latitude.toFixed(6)}, {selectedCoordinates.longitude.toFixed(6)}
                    </p>
                  </div>
                </article>
              </InfoWindow>
            )}

          </Map>
          
        </div>
      </APIProvider>

      <section className="hazards-section" aria-labelledby="hazards-title">
        <div className="section-title-row">
          <h2 id="hazards-title">דיווחי מפגעים</h2>
          <span>{hazards.length} דיווחים</span>
        </div>

        {hazards.length > 0 ? (
          <div className="hazards-grid">
            {hazards.map((hazard) => {
              const coordinates = getHazardCoordinates(hazard)
              const imageUrl = getImageUrl(hazard.image_bytes)

              return (
                <article className="hazard-card" key={hazard.id}>
                  <div className="hazard-image">
                    {imageUrl ? (
                      <img src={imageUrl} alt={hazard.description || 'תמונת מפגע'} loading="lazy" />
                    ) : (
                      <span>אין תמונה</span>
                    )}
                  </div>

                  <div className="hazard-content">
                    <h3>{hazard.description || 'דיווח על מפגע'}</h3>
                    <dl>
                      <div>
                        <dt>קו רוחב</dt>
                        <dd>{coordinates ? coordinates.latitude.toFixed(6) : 'לא זמין'}</dd>
                      </div>
                      <div>
                        <dt>קו אורך</dt>
                        <dd>{coordinates ? coordinates.longitude.toFixed(6) : 'לא זמין'}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="empty-state">אין כרגע דיווחי מפגעים להצגה.</p>
        )}
      </section>
    </main>
  )
}

export default App
