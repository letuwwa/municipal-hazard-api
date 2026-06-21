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

const initialReportForm = {
  description: '',
  latitude: '',
  longitude: '',
  image: null,
}

function App() {
  const [hazards, setHazards] = useState([])
  const [selectedHazardId, setSelectedHazardId] = useState(null)
  const [error, setError] = useState(null)
  const [reportForm, setReportForm] = useState(initialReportForm)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [imageInputKey, setImageInputKey] = useState(0)
  const [submitStatus, setSubmitStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedHazard = hazards.find((hazard) => hazard.id === selectedHazardId)
  const selectedCoordinates = selectedHazard ? getHazardCoordinates(selectedHazard) : null
  const selectedImageUrl = selectedHazard ? getImageUrl(selectedHazard.image_bytes) : null

  const fetchHazards = async (signal) => {
    setError(null)

    const headers = ACCESS_TOKEN
      ? { Authorization: `Bearer ${ACCESS_TOKEN}` }
      : {}

    const response = await fetch(`${API_BASE_URL}/api/v1/hazards/`, {
      method: 'GET',
      headers,
      signal,
    })

    if (!response.ok) {
      throw new Error(`שגיאה בקבלת הנתונים מהשרת (${response.status})`)
    }

    const data = await response.json()
    setHazards(Array.isArray(data) ? data : [])
    setSelectedHazardId(null)
  }

  useEffect(() => {
    const controller = new AbortController()

    const loadHazards = async () => {
      try {
        await fetchHazards(controller.signal)
      } catch (err) {
        if (err.name === 'AbortError') return

        console.error(err)
        setError(err.message)
      }
    }

    loadHazards()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  const handleReportChange = (event) => {
    const { name, value } = event.target
    setReportForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleImageChange = (event) => {
    const image = event.target.files?.[0] ?? null

    setReportForm((currentForm) => ({
      ...currentForm,
      image,
    }))

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(image ? URL.createObjectURL(image) : null)
  }

  const handleReportSubmit = async (event) => {
    event.preventDefault()
    setSubmitStatus(null)

    if (!ACCESS_TOKEN) {
      setSubmitStatus({ type: 'error', text: 'חסר טוקן גישה.' })
      return
    }

    const latitude = Number.parseFloat(reportForm.latitude)
    const longitude = Number.parseFloat(reportForm.longitude)

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setSubmitStatus({ type: 'error', text: 'יש להזין קואורדינטות תקינות.' })
      return
    }

    const formData = new FormData()
    formData.append('description', reportForm.description.trim())
    formData.append('latitude', latitude)
    formData.append('longitude', longitude)
    if (reportForm.image) formData.append('image', reportForm.image)

    try {
      setIsSubmitting(true)

      const response = await fetch(`${API_BASE_URL}/api/v1/hazards/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`שגיאה בשליחת הדיווח (${response.status})`)
      }

      setReportForm(initialReportForm)
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl(null)
      setImageInputKey((currentKey) => currentKey + 1)
      setSubmitStatus({ type: 'success', text: 'הדיווח נוסף בהצלחה.' })
      await fetchHazards()
    } catch (err) {
      console.error(err)
      setSubmitStatus({ type: 'error', text: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

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

      <section className="report-panel" aria-labelledby="report-title">
        <div className="section-title-row">
          <h2 id="report-title">דיווח חדש</h2>
        </div>

        <form className="report-form" onSubmit={handleReportSubmit}>
          <label className="form-field form-field-full">
            <span>תיאור</span>
            <textarea
              name="description"
              value={reportForm.description}
              onChange={handleReportChange}
              minLength={5}
              required
              rows={3}
            />
          </label>

          <label className="form-field">
            <span>קו רוחב</span>
            <input
              name="latitude"
              type="number"
              value={reportForm.latitude}
              onChange={handleReportChange}
              min="-90"
              max="90"
              step="0.000001"
              required
            />
          </label>

          <label className="form-field">
            <span>קו אורך</span>
            <input
              name="longitude"
              type="number"
              value={reportForm.longitude}
              onChange={handleReportChange}
              min="-180"
              max="180"
              step="0.000001"
              required
            />
          </label>

          <div className="form-field form-field-full">
            <span>תמונה</span>
            <label className="image-upload">
              <input
                key={imageInputKey}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <span>{reportForm.image ? reportForm.image.name : 'בחירת תמונה'}</span>
            </label>
          </div>

          <div className="image-preview">
            {imagePreviewUrl ? (
              <img src={imagePreviewUrl} alt="תצוגה מקדימה" />
            ) : (
              <span>אין תמונה</span>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'שולח...' : 'הוספת דיווח'}
            </button>
          </div>

          {submitStatus && (
            <p className={`form-status ${submitStatus.type}`}>{submitStatus.text}</p>
          )}
        </form>
      </section>

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
